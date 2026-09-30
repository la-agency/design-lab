"use client";

import { useRef, useState } from "react";
import type { ComponentProps } from "react";

import { cn } from "../lib/utils";
import { Input } from "./input";
import styles from "./drag-number-input.module.css";

type Props = Omit<ComponentProps<typeof Input>, "type" | "value" | "defaultValue" | "onChange" | "min" | "max" | "step"> & {
  defaultValue?: number;
  min: number;
  max: number;
  step?: number;
};

export function DragNumberInput({ defaultValue, min, max, step = 1, className, ...props }: Props) {
  const [value, setValue] = useState(defaultValue?.toString() ?? "");
  const [scrubbing, setScrubbing] = useState(false);
  const drag = useRef<{ id: number; x: number; start: number; original: string; moved: boolean } | null>(null);

  function cancel() {
    if (drag.current) setValue(drag.current.original);
    drag.current = null;
    setScrubbing(false);
  }

  return (
    <Input
      {...props}
      type="number"
      min={min}
      max={max}
      step={step}
      value={value}
      className={cn(styles.input, className)}
      data-scrubbing={scrubbing || undefined}
      title="Drag left or right to adjust. Click to type."
      onChange={(event) => setValue(event.currentTarget.value)}
      onPointerDown={(event) => {
        const input = event.currentTarget;
        // Once editing, preserve normal caret placement and text selection.
        if (event.button !== 0 || !event.isPrimary || input === input.ownerDocument.activeElement || !value || !Number.isFinite(Number(value))) return;
        event.preventDefault();
        input.focus({ preventScroll: true });
        input.setPointerCapture(event.pointerId);
        drag.current = { id: event.pointerId, x: event.clientX, start: Number(value), original: value, moved: false };
      }}
      onPointerMove={(event) => {
        const current = drag.current;
        if (!current || current.id !== event.pointerId) return;
        const delta = event.clientX - current.x;
        if (!current.moved && Math.abs(delta) < 3) return;
        current.moved = true;
        setScrubbing(true);
        event.preventDefault();
        // clientX is in viewport pixels, so sensitivity stays constant at any canvas zoom.
        setValue(String(Math.min(max, Math.max(min, current.start + Math.round(delta) * step))));
      }}
      onPointerUp={(event) => {
        const current = drag.current;
        if (!current || current.id !== event.pointerId) return;
        drag.current = null;
        setScrubbing(false);
        event.currentTarget.releasePointerCapture(event.pointerId);
        if (current.moved) {
          event.currentTarget.blur();
          // Commit once on release, preserving one canvas undo entry per drag.
          event.currentTarget.form?.requestSubmit();
        } else {
          event.currentTarget.select();
        }
      }}
      onPointerCancel={cancel}
      onLostPointerCapture={cancel}
      onKeyDown={(event) => {
        if (event.key === "Escape" && drag.current) {
          event.preventDefault();
          event.stopPropagation();
          const id = drag.current.id;
          cancel();
          event.currentTarget.releasePointerCapture(id);
          event.currentTarget.blur();
        }
      }}
    />
  );
}
