import type { BoardDefinition } from "./types";

type Rect = { x: number; y: number; width: number; height: number };
type Surface = { invalidate(): void; dispose(): void };
export type AnnotationTarget = {
  id: string;
  name: string;
  role: string;
  rect: Rect;
  metadata: Record<string, string>;
};
type AnnotationDocument = Document & {
  oai?: { annotation?: {
    isActive?: () => boolean;
    registerSurface?: (options: {
      element: HTMLElement;
      hitTest: (point: { clientX: number; clientY: number }) => AnnotationTarget | null;
    }) => Surface;
  } };
};

export function isAnnotating(document: Document) {
  return (document as AnnotationDocument).oai?.annotation?.isActive?.() === true;
}

// Bounds and pointer coordinates are both viewport CSS pixels. Never combine
// iframe-local rectangles with top-level coordinates without applying scale.
export function frameCoordinates(bounds: Rect, width: number, height: number) {
  if (width <= 0 || height <= 0 || bounds.width <= 0 || bounds.height <= 0) return null;
  const scaleX = bounds.width / width;
  const scaleY = bounds.height / height;
  return {
    point(x: number, y: number) {
      if (x < bounds.x || y < bounds.y || x >= bounds.x + bounds.width || y >= bounds.y + bounds.height) return null;
      return { x: (x - bounds.x) / scaleX, y: (y - bounds.y) / scaleY };
    },
    rect(local: Rect): Rect | null {
      const x = Math.max(0, local.x);
      const y = Math.max(0, local.y);
      const right = Math.min(width, local.x + local.width);
      const bottom = Math.min(height, local.y + local.height);
      if (right <= x || bottom <= y) return null;
      return { x: bounds.x + x * scaleX, y: bounds.y + y * scaleY, width: (right - x) * scaleX, height: (bottom - y) * scaleY };
    },
  };
}

function selectorFor(element: Element) {
  const parts: string[] = [];
  for (let current: Element | null = element; current && current.tagName !== "BODY"; current = current.parentElement) {
    if (current.id) {
      parts.unshift(`#${CSS.escape(current.id)}`);
      break;
    }
    const tag = current.tagName.toLowerCase();
    const siblings = current.parentElement ? Array.from(current.parentElement.children).filter((child) => child.tagName === current.tagName) : [];
    parts.unshift(`${tag}:nth-of-type(${siblings.indexOf(current) + 1})`);
  }
  return parts.join(" > ");
}

export function previewTarget(iframe: HTMLIFrameElement, board: BoardDefinition, clientX: number, clientY: number): AnnotationTarget | null {
  const document = iframe.contentDocument;
  if (!document || iframe.closest("[hidden]")) return null;
  const coordinates = frameCoordinates(iframe.getBoundingClientRect(), iframe.clientWidth, iframe.clientHeight);
  const point = coordinates?.point(clientX, clientY);
  if (!coordinates || !point) return null;
  const hit = document.elementFromPoint(point.x, point.y);
  if (!hit || hit === document.body || hit === document.documentElement) return null;
  // Prefer the containing control/heading to a decorative icon or text span.
  const element = hit.closest("[data-design-component]") ?? hit.closest("button, a, h1, h2, h3, h4, h5, h6, p, label, input, textarea, select, img, [role=button]") ?? hit;
  if (element.hasAttribute("data-design-preview") || element.hasAttribute("data-design-source")) return null;
  const rect = coordinates.rect(element.getBoundingClientRect());
  if (!rect) return null;
  const selector = selectorFor(element);
  const visibleText = "innerText" in element && typeof element.innerText === "string" ? element.innerText : element.textContent;
  const text = (element.getAttribute("aria-label") || element.getAttribute("alt") || visibleText || "").replace(/\s+/gu, " ").trim().slice(0, 200);
  const tag = element.tagName.toLowerCase();
  return {
    id: `${board.id}:${selector}`,
    name: `${board.title} · ${text || tag}`.slice(0, 240),
    role: element.getAttribute("role") || tag,
    rect,
    metadata: {
      Board: board.id.slice(0, 200),
      Source: (board.sourcePath || "").slice(0, 200),
      Selector: selector.slice(0, 200),
      Text: text,
      Preview: (board.preview || "").slice(0, 200),
    },
  };
}

export function selectionContext(target: AnnotationTarget) {
  return [
    `Design selection: ${target.name}`,
    `Source: ${target.metadata.Source || "See preview URL"}`,
    `Board: ${target.metadata.Board}`,
    `Element: ${target.role}`,
    `Selector: ${target.metadata.Selector}`,
    `Text: ${target.metadata.Text}`,
    `Preview: ${target.metadata.Preview}`,
  ].join("\n");
}

export function registerPreviewAnnotations(iframe: HTMLIFrameElement, board: BoardDefinition) {
  const document = iframe.ownerDocument as AnnotationDocument;
  const annotation = document.oai?.annotation;
  if (typeof annotation?.registerSurface !== "function") {
    iframe.dataset.annotationSurface = "unavailable";
    return () => { delete iframe.dataset.annotationSurface; };
  }
  const surface = annotation.registerSurface({
    element: iframe.parentElement ?? iframe,
    hitTest: ({ clientX, clientY }) => previewTarget(iframe, board, clientX, clientY),
  });
  iframe.dataset.annotationSurface = "registered";
  const invalidate = () => surface.invalidate();
  const resize = new ResizeObserver(invalidate);
  resize.observe(iframe);
  // Canvas pan/zoom, board movement, revision visibility and fullscreen all
  // change ancestor geometry without necessarily resizing the iframe itself.
  const mutations = new MutationObserver(invalidate);
  for (let element: Element | null = iframe; element; element = element.parentElement) {
    mutations.observe(element, { attributes: true, attributeFilter: ["style", "class", "hidden", "open", "data-fullscreen"] });
  }
  document.addEventListener("scroll", invalidate, true);
  let content: Document | null = null;
  const contentChanges = new MutationObserver(invalidate);
  function observeContent() {
    content?.removeEventListener("scroll", invalidate, true);
    contentChanges.disconnect();
    content = iframe.contentDocument;
    content?.addEventListener("scroll", invalidate, true);
    if (content?.body) contentChanges.observe(content.body, { subtree: true, childList: true, attributes: true, characterData: true });
    invalidate();
  }
  observeContent();
  iframe.addEventListener("load", observeContent);
  return () => {
    resize.disconnect();
    mutations.disconnect();
    document.removeEventListener("scroll", invalidate, true);
    content?.removeEventListener("scroll", invalidate, true);
    contentChanges.disconnect();
    iframe.removeEventListener("load", observeContent);
    surface.dispose();
    delete iframe.dataset.annotationSurface;
  };
}
