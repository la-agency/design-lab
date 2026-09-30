"use client";

import { Button } from "./ui/button";
import { DragNumberInput } from "./ui/drag-number-input";

import { useId } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

import styles from "./canvas.module.css";

export type BoardSize = { width: number; height: number; maxHeight?: number };

const presets = [
  { label: "Mobile", width: 390, height: 844 },
  { label: "Tablet", width: 768, height: 1024 },
  { label: "Laptop", width: 1280, height: 800 },
  { label: "Desktop", width: 1440, height: 900 },
];

export function ResolutionControls({
  size,
  onChange,
  onMaxHeightChange,
  maxHeight: sharedMaxHeight,
  label,
}: {
  size?: BoardSize;
  maxHeight?: number;
  onChange: (size: BoardSize) => void;
  label: string;
  onMaxHeightChange?: (height: number | undefined) => void;
}) {
  const fieldId = useId();
  const capHeight = sharedMaxHeight ?? size?.maxHeight;
  const preset = presets.find((item) => item.width === size?.width);
  return (
    <form
      className={styles.resolutionControls}
      key={`${size?.width}-${capHeight}`}
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const width = Number(data.get("width"));
        const height = size?.height ?? 720;
        const maxHeight =
          capHeight === undefined ? undefined : Number(data.get("height"));
        if (
          width === 0 &&
          onMaxHeightChange &&
          maxHeight !== undefined &&
          Number.isInteger(maxHeight) &&
          maxHeight >= 240 &&
          maxHeight <= 7680
        ) {
          onMaxHeightChange(maxHeight);
          return;
        }
        if (
          !Number.isInteger(width) ||
          !Number.isInteger(height) ||
          width < 240 ||
          (maxHeight !== undefined &&
            (!Number.isInteger(maxHeight) ||
              maxHeight < 240 ||
              maxHeight > 7680)) ||
          width > 7680 ||
          height > 7680
        ) {
          return;
        }
        onChange({ width, height, maxHeight });
      }}
    >
      <Select
        value={preset?.label ?? "custom"}
        onValueChange={(value) => {
          const selected = presets.find(
            (item) => item.label === value
          );
          if (selected) {
            onChange({
              width: selected.width,
              height: size?.height ?? selected.height,
              maxHeight: capHeight,
            });
          }
        }}
      >
        <SelectTrigger size="sm" className="w-[180px] text-xs" aria-label={`Resolution preset for ${label}`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent position="popper" align="start">
          <SelectItem value="custom">{size ? "Custom width" : "Mixed widths"}</SelectItem>
          {presets.map((item) => (
            <SelectItem key={item.label} value={item.label}>
              {item.label} · {item.width}px
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <label htmlFor={`${fieldId}-width`}>
        W
        <DragNumberInput
          className="h-8 w-14 px-2 text-xs md:text-xs tabular-nums"
          id={`${fieldId}-width`}
          name="width"
          aria-label={`Width for ${label}`}
          required={!onMaxHeightChange || capHeight === undefined}
          min={240}
          max={7680}
          step={1}
          defaultValue={size?.width}
          placeholder="Mixed"
        />
      </label>
      {capHeight !== undefined && (
        <label htmlFor={`${fieldId}-height`}>
          Max H
          <DragNumberInput
            className="h-8 w-14 px-2 text-xs md:text-xs tabular-nums"
            id={`${fieldId}-height`}
            name="height"
            aria-label={`Max height for ${label}`}
            required
            min={240}
            max={7680}
            step={1}
            defaultValue={capHeight}
            placeholder="Mixed"
          />
        </label>
      )}
      <Button variant="outline" size="sm" className="text-xs"
        type="button"
        aria-label={`Toggle max height for ${label}`}
        aria-pressed={capHeight !== undefined}
        onClick={() => {
          const maxHeight =
            capHeight === undefined ? (size?.height ?? 900) : undefined;
          if (onMaxHeightChange) {
            onMaxHeightChange(maxHeight);
            return;
          }
          onChange({
            width: size?.width ?? 1440,
            height: size?.height ?? 720,
            maxHeight,
          });
        }}
      >
        {capHeight === undefined ? "Set max height" : "Full height"}
      </Button>
      <Button variant="secondary" size="sm" className="text-xs" type="submit">Apply</Button>
    </form>
  );
}
