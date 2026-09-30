import { describe, expect, it } from "vitest";

import { frameCoordinates, isAnnotating, previewTarget, registerPreviewAnnotations, selectionContext } from "./preview-annotations";
import type { BoardDefinition } from "./types";

describe("preview annotation coordinates", () => {
  it("maps a heading through canvas zoom and pan in both directions", () => {
    const coordinates = frameCoordinates({ x: 110, y: 220, width: 768, height: 600 }, 1280, 1000)!;
    expect(coordinates.point(230, 400)).toEqual({ x: 200, y: 300 });
    expect(coordinates.rect({ x: 90, y: 188, width: 780, height: 158 })).toEqual({
      x: 164, y: 332.8, width: 468, height: 94.8,
    });
  });

  it("clips scrolled or capped elements to the visible frame", () => {
    const coordinates = frameCoordinates({ x: 20, y: 40, width: 200, height: 300 }, 400, 300)!;
    expect(coordinates.rect({ x: -10, y: -100, width: 300, height: 500 })).toEqual({
      x: 20, y: 40, width: 145, height: 300,
    });
    expect(coordinates.rect({ x: 0, y: 350, width: 100, height: 100 })).toBeNull();
    expect(coordinates.point(220, 40)).toBeNull();
    expect(coordinates.point(10, 40)).toBeNull();
    expect(frameCoordinates({ x: 0, y: 0, width: 0, height: 0 }, 400, 300)).toBeNull();
  });

  it("keeps source and element identity stable after moving and zooming", () => {
    const body = { tagName: "BODY", children: [] };
    const heading = {
      tagName: "H1", id: "", parentElement: body, textContent: "Make room for your next idea.",
      closest: () => heading,
      hasAttribute: () => false,
      getAttribute: () => null,
      getBoundingClientRect: () => ({ x: 90, y: 188, width: 780, height: 158 }),
    };
    Object.assign(body, { children: [heading] });
    let bounds = { x: 110, y: 220, width: 768, height: 600 };
    let picked: number[] = [];
    const iframe = {
      clientWidth: 1280, clientHeight: 1000, closest: () => null,
      getBoundingClientRect: () => bounds,
      contentDocument: { body, elementFromPoint: (x: number, y: number) => { picked = [x, y]; return heading; } },
    } as unknown as HTMLIFrameElement;
    const board: BoardDefinition = { id: "landing-v1", title: "V1", description: "", width: 1280, height: 1000, sourcePath: "designs/landing/versions/v1.tsx" };
    const first = previewTarget(iframe, board, 230, 400)!;
    expect(picked).toEqual([200, 300]);
    expect(first.rect).toEqual({ x: 164, y: 332.8, width: 468, height: 94.8 });
    expect(first.metadata.Source).toBe("designs/landing/versions/v1.tsx");
    expect(selectionContext(first)).toContain("Source: designs/landing/versions/v1.tsx\nBoard: landing-v1\nElement: h1\nSelector: h1:nth-of-type(1)");
    bounds = { x: -300, y: 80, width: 1280, height: 1000 };
    const second = previewTarget(iframe, board, -100, 380)!;
    expect(second.id).toBe(first.id);
    expect(second.rect).toEqual({ x: -210, y: 268, width: 780, height: 158 });
    expect(previewTarget(iframe, board, 2000, 400)).toBeNull();
  });

  it("leaves unsupported browsers alone and reads confirmed annotation state", () => {
    expect(isAnnotating({} as Document)).toBe(false);
    expect(isAnnotating({ oai: { annotation: { isActive: () => true } } } as unknown as Document)).toBe(true);
  });

  it("reports when the native bridge is unavailable instead of implying registration", () => {
    const iframe = { ownerDocument: {}, dataset: {} } as unknown as HTMLIFrameElement;
    const board = { id: "example" } as BoardDefinition;
    const dispose = registerPreviewAnnotations(iframe, board);
    expect(iframe.dataset.annotationSurface).toBe("unavailable");
    dispose?.();
    expect(iframe.dataset.annotationSurface).toBeUndefined();
  });
});
