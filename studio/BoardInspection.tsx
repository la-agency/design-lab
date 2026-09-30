"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode, RefObject } from "react";
import { Check, Copy, MousePointer2, X } from "lucide-react";

import { Button } from "./ui/button";
import { previewTarget, selectionContext } from "./preview-annotations";
import type { AnnotationTarget } from "./preview-annotations";
import type { BoardDefinition } from "./types";
import styles from "./inspection.module.css";

type Selection = {
  target: AnnotationTarget;
  rect: { x: number; y: number; width: number; height: number };
};
type Inspection = {
  active: boolean;
  setActive: (active: boolean) => void;
  selection: Selection | null;
  setSelection: (selection: Selection | null) => void;
};
const InspectionContext = createContext<Inspection | null>(null);

export function BoardInspection({ children, resetKey }: { children: ReactNode; resetKey: string }) {
  const [active, setActive] = useState(false);
  const [selection, setSelection] = useState<Selection | null>(null);
  useEffect(() => { setActive(false); setSelection(null); }, [resetKey]);
  return <InspectionContext value={{ active, setActive, selection, setSelection }}>{children}</InspectionContext>;
}

export function InspectionControls({ title }: { title: string }) {
  const inspection = useContext(InspectionContext);
  const [copied, setCopied] = useState<AnnotationTarget | null>(null);
  const [error, setError] = useState(false);
  if (!inspection) return null;
  const { active, setActive, selection, setSelection } = inspection;
  return (
    <div className={styles.controls}>
      <Button variant={active ? "secondary" : "ghost"} size="sm" className="text-xs"
        aria-label={`Select element in ${title}`} aria-pressed={active}
        onClick={() => { setActive(!active); setSelection(null); setError(false); }}>
        {active ? <X size={14} /> : <MousePointer2 size={14} />}
        {active ? "Done selecting" : "Copy element context"}
      </Button>
      {selection && <>
        <span className={styles.target} title={selection.target.name}>{selection.target.role} · {selection.target.metadata.Text || selection.target.name}</span>
        <Button variant="outline" size="sm" className="text-xs" onClick={async () => {
          try {
            await navigator.clipboard.writeText(selectionContext(selection.target));
            setCopied(selection.target);
            setError(false);
          } catch { setError(true); }
        }}>
          {copied === selection.target ? <Check size={14} /> : <Copy size={14} />}
          {copied === selection.target ? "Copied" : "Copy selection"}
        </Button>
      </>}
      <span role="status" className={error ? styles.error : styles.status}>
        {error ? "Clipboard unavailable. Use the browser’s Annotate control." : copied === selection?.target ? "Selection copied. Paste into your prompt." : ""}
      </span>
    </div>
  );
}

export function InspectionOverlay({ iframe, board }: {
  iframe: RefObject<HTMLIFrameElement | null>;
  board: BoardDefinition;
}) {
  const inspection = useContext(InspectionContext);
  const [hovered, setHovered] = useState<Selection | null>(null);
  useEffect(() => { setHovered(null); }, [inspection?.active]);
  if (!inspection?.active) return null;
  const { selection, setSelection, setActive } = inspection;
  const highlighted = hovered ?? selection;
  function pick(clientX: number, clientY: number): Selection | null {
    const frame = iframe.current;
    if (!frame) return null;
    const target = previewTarget(frame, board, clientX, clientY);
    if (!target) return null;
    const bounds = frame.getBoundingClientRect();
    const scaleX = bounds.width / frame.clientWidth;
    const scaleY = bounds.height / frame.clientHeight;
    return { target, rect: {
      x: (target.rect.x - bounds.x) / scaleX,
      y: (target.rect.y - bounds.y) / scaleY,
      width: target.rect.width / scaleX,
      height: target.rect.height / scaleY,
    } };
  }
  return (
    <div className={styles.overlay} data-design-inspector role="button" tabIndex={0}
      aria-label={`Pick an element in ${board.title}`}
      onPointerMove={(event) => { event.stopPropagation(); setHovered(pick(event.clientX, event.clientY)); }}
      onPointerLeave={() => setHovered(null)}
      onPointerDown={(event) => { event.stopPropagation(); event.currentTarget.focus({ preventScroll: true }); }}
      onClick={(event) => { event.stopPropagation(); setSelection(pick(event.clientX, event.clientY)); }}
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.key === "Escape") { setActive(false); setSelection(null); }
        if (event.key === "Enter" && hovered) { event.preventDefault(); setSelection(hovered); return; }
        if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
          event.preventDefault();
          const frame = iframe.current;
          if (!frame?.contentDocument) return;
          const bounds = frame.getBoundingClientRect();
          const targets = Array.from(frame.contentDocument.querySelectorAll("h1,h2,h3,h4,h5,h6,p,a,button,input,textarea,select,img,[data-design-component]"))
            .flatMap((element) => {
              const rect = element.getBoundingClientRect();
              const target = pick(bounds.x + (rect.x + rect.width / 2) * bounds.width / frame.clientWidth,
                bounds.y + (rect.y + rect.height / 2) * bounds.height / frame.clientHeight);
              return target ? [target] : [];
            });
          const current = targets.findIndex((item) => item.target.id === selection?.target.id);
          const next = (current + (event.key === "ArrowUp" ? -1 : 1) + targets.length) % targets.length;
          setHovered(null);
          setSelection(targets[next] ?? null);
        }
      }}>
      {highlighted && <div className={styles.outline} data-inspected-element={highlighted.target.role}
        style={{ left: highlighted.rect.x, top: highlighted.rect.y, width: highlighted.rect.width, height: highlighted.rect.height }}>
        <span>{highlighted.target.role}</span>
      </div>}
    </div>
  );
}
