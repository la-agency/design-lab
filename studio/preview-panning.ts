import { isAnnotating } from "./preview-annotations";

export function enablePreviewPanning(
  iframe: HTMLIFrameElement,
  document: Document
) {
  document.addEventListener(
    "selectstart",
    (event) => {
      const { target } = event;
      const element =
        target && "closest" in target
          ? (target as Element)
          : (target as Node | null)?.parentElement;
      if (
        !isAnnotating(iframe.ownerDocument) &&
        !iframe.closest("dialog:modal") &&
        !element?.closest("input, textarea, [contenteditable=true]")
      ) {
        event.preventDefault();
      }
    },
    true
  );
  let drag: { id: number; x: number; y: number } | null = null;
  document.addEventListener(
    "pointerdown",
    (event) => {
      if (isAnnotating(iframe.ownerDocument) || iframe.closest("dialog:modal") || event.button !== 0) {
        return;
      }
      const target = event.target as Element | null;
      if (
        !target?.closest ||
        target.closest(
          "button, a, input, textarea, select, summary, [contenteditable=true], [role=button], [role=slider]"
        )
      ) {
        return;
      }
      event.preventDefault();
      target.setPointerCapture(event.pointerId);
      drag = point(event);
    },
    true
  );
  document.addEventListener(
    "pointermove",
    (event) => {
      if (isAnnotating(iframe.ownerDocument)) {
        drag = null;
        return;
      }
      if (!drag || drag.id !== event.pointerId) {
        return;
      }
      event.preventDefault();
      const next = point(event);
      iframe.dispatchEvent(
        new WheelEvent("wheel", {
          bubbles: true,
          cancelable: true,
          deltaX: drag.x - next.x,
          deltaY: drag.y - next.y,
        })
      );
      drag = next;
    },
    true
  );
  function release() {
    drag = null;
  }
  document.addEventListener("pointerup", release, true);
  document.addEventListener("pointercancel", release, true);
  document.addEventListener("lostpointercapture", release, true);
}

function point(event: PointerEvent) {
  return {
    id: event.pointerId,
    // Frame-local coordinates shift as the canvas moves under the pointer.
    x: event.screenX,
    y: event.screenY,
  };
}
