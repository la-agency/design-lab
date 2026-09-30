"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useCanvasHistory } from "./CanvasHistory";
import { InspectionOverlay } from "./BoardInspection";
import { enablePreviewPanning } from "./preview-panning";
import { isAnnotating, registerPreviewAnnotations } from "./preview-annotations";
import type { BoardDefinition } from "./types";

import styles from "./homepage-canvas.module.css";

export function PreviewBoard({
  board,
  src,
}: {
  board: BoardDefinition;
  src: string;
}) {
  const history = useCanvasHistory();
  const [contentHeight, setContentHeight] = useState(board.height);
  const contentObserver = useRef<ResizeObserver | null>(null);
  useEffect(() => () => contentObserver.current?.disconnect(), []);
  const preview = useRef<HTMLIFrameElement>(null);
  useEffect(() => {
    if (preview.current) return registerPreviewAnnotations(preview.current, board);
  }, [board]);
  const initializedDocument = useRef<Document | null>(null);
  const initialize = useCallback(
    (iframe: HTMLIFrameElement) => {
      const content = iframe.contentWindow;
      if (!content || initializedDocument.current === content.document) {
        return;
      }
      initializedDocument.current = content.document;
      enablePreviewPanning(iframe, content.document);
      contentObserver.current?.disconnect();
      const documentBody = content.document.body;
      const previewShell = content.document.querySelector(
        "[data-design-preview]"
      );
      function measure() {
        const height = previewShell
          ? Math.ceil(previewShell.getBoundingClientRect().height)
          : Math.ceil(documentBody.getBoundingClientRect().height);
        if (height > 0) {
          setContentHeight(height);
        }
      }
      const observer = new ResizeObserver(measure);
      observer.observe(documentBody);
      if (previewShell) {
        observer.observe(previewShell);
      }
      contentObserver.current = observer;
      measure();
      content.addEventListener("design-history-change", (event) => {
        if (!("detail" in event)) {
          return;
        }
        const change = event.detail;
        if (
          typeof change !== "object" ||
          change === null ||
          !("undo" in change) ||
          !("redo" in change) ||
          typeof change.undo !== "function" ||
          typeof change.redo !== "function"
        ) {
          return;
        }
        const { undo } = change;
        const { redo } = change;
        history.record({
          label: `Change ${board.title}`,
          undo: () => undo(),
          redo: () => redo(),
        });
      });
      content.document.addEventListener("click", (click) => {
        const anchor = click
          .composedPath()
          .find(
            (node): node is HTMLAnchorElement =>
              typeof node === "object" &&
              node !== null &&
              "tagName" in node &&
              node.tagName === "A"
          );
        if (!anchor) {
          return;
        }
        const destination = new URL(anchor.href);
        if (
          destination.origin === window.location.origin &&
          destination.pathname.startsWith("/files/")
        ) {
          click.preventDefault();
          window.location.assign(destination.href);
        }
      });
      content.addEventListener(
        "wheel",
        (wheel) => {
          if (isAnnotating(iframe.ownerDocument)) return;
          const localScroll = wheel
            .composedPath()
            .some(
              (node) =>
                typeof node === "object" &&
                node !== null &&
                "hasAttribute" in node &&
                typeof node.hasAttribute === "function" &&
                node.hasAttribute("data-preview-scroll")
            );
          if (localScroll && !wheel.ctrlKey && !wheel.metaKey) {
            return;
          }
          if (iframe.closest("dialog:modal")) {
            return;
          }
          wheel.preventDefault();
          const bounds = iframe.getBoundingClientRect();
          iframe.dispatchEvent(
            new WheelEvent("wheel", {
              bubbles: true,
              cancelable: true,
              deltaX: wheel.deltaX,
              deltaY: wheel.deltaY,
              deltaMode: wheel.deltaMode,
              ctrlKey: wheel.ctrlKey,
              metaKey: wheel.metaKey,
              shiftKey: wheel.shiftKey,
              clientX:
                bounds.left +
                (wheel.clientX * bounds.width) / iframe.clientWidth,
              clientY:
                bounds.top +
                (wheel.clientY * bounds.height) / iframe.clientHeight,
            })
          );
        },
        { passive: false, capture: true }
      );
      content.addEventListener("keydown", (key) => {
        if (isAnnotating(iframe.ownerDocument)) return;
        const target = content.document.activeElement;
        if (
          (key.ctrlKey || key.metaKey) &&
          ["KeyZ", "KeyY"].includes(key.code) &&
          !target?.closest("input, textarea, [contenteditable=true]")
        ) {
          key.preventDefault();
          window.dispatchEvent(
            new KeyboardEvent("keydown", {
              code: key.code,
              ctrlKey: key.ctrlKey,
              metaKey: key.metaKey,
              shiftKey: key.shiftKey,
            })
          );
          return;
        }
        const modal = iframe.closest("dialog:modal");
        if (modal) {
          if (
            ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(
              key.code
            ) &&
            !key.metaKey &&
            !key.ctrlKey &&
            !key.altKey &&
            !key.shiftKey &&
            !target?.closest(
              "input, textarea, select, [contenteditable=true], [role=slider], [role=tablist], [role=menu], [role=radio]"
            ) &&
            !content.document.querySelector(
              "dialog:modal, [role=dialog][aria-modal=true]"
            )
          ) {
            key.preventDefault();
            modal.dispatchEvent(
              new KeyboardEvent("keydown", {
                key: key.key,
                code: key.code,
                bubbles: true,
                cancelable: true,
              })
            );
            return;
          }
          if (key.code === "Escape") {
            key.preventDefault();
            modal.dispatchEvent(new Event("cancel", { cancelable: true }));
          }
          return;
        }
        if (
          target?.closest("input, textarea, select, [contenteditable=true]")
        ) {
          return;
        }
        if (
          ![
            "Space",
            "Digit0",
            "Digit1",
            "Equal",
            "Minus",
            "Numpad0",
            "NumpadAdd",
            "NumpadSubtract",
          ].includes(key.code)
        ) {
          return;
        }
        key.preventDefault();
        window.dispatchEvent(
          new KeyboardEvent("keydown", {
            key: key.key,
            code: key.code,
            shiftKey: key.shiftKey,
          })
        );
      });
      content.addEventListener("keyup", (key) =>
        window.dispatchEvent(new KeyboardEvent("keyup", { code: key.code }))
      );
    },
    [history, board.title]
  );
  useEffect(() => {
    const iframe = preview.current;
    if (
      iframe?.contentDocument?.readyState === "complete" &&
      iframe.contentDocument.querySelector("[data-design-preview]")
    ) {
      initialize(iframe);
    }
  }, [initialize]);
  return (
    <>
    <iframe
      className={styles.preview}
      title={board.title}
      style={{ height: contentHeight }}
      loading="lazy"
      src={src}
      ref={preview}
      onLoad={(event) => initialize(event.currentTarget)}
    />
    <InspectionOverlay iframe={preview} board={board} />
    </>
  );
}
