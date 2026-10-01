import type { CanvasLayout } from "../layout-state";
import { DataError } from "./database";

function same(a: unknown, b: unknown) { return JSON.stringify(a) === JSON.stringify(b); }
/** Merge independent board edits; reject edits to the same geometry or group list. */
export function mergeLayout(base: CanvasLayout, proposed: CanvasLayout, historical: CanvasLayout | null, current: CanvasLayout | null): CanvasLayout {
  const merged = structuredClone(current ?? proposed);
  const conflicts: string[] = [];
  for (const field of ["colour", "groups"] as const) {
    if (same(base[field], proposed[field])) continue;
    if (current && !same(historical?.[field], current[field]) && !same(proposed[field], current[field])) conflicts.push(field);
    else if (field === "colour") merged.colour = proposed.colour;
    else merged.groups = proposed.groups;
  }
  for (const field of ["sizes", "offsets"] as const) {
    for (const id of new Set([...Object.keys(base[field]), ...Object.keys(proposed[field])])) {
      if (same(base[field][id], proposed[field][id])) continue;
      if (current && ((!same(historical?.[field][id], current[field][id])) || (historical?.[field][id] !== undefined && !same(base[field][id], historical[field][id]))) && !same(proposed[field][id], current[field][id])) {
        conflicts.push(`${field}/${id}`); continue;
      }
      if (!(id in proposed[field])) delete merged[field][id];
      else if (field === "sizes") merged.sizes[id] = proposed.sizes[id];
      else merged.offsets[id] = proposed.offsets[id];
    }
  }
  if (conflicts.length) throw new DataError(`Layout changed elsewhere: ${conflicts.join(", ")}. Your layout is kept on screen.`, 409, current);
  return merged;
}
