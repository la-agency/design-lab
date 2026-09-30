import { canvasRows } from "./auto-layout";
import type { CanvasPage } from "./types";

export type BoardGroup = { name: string; boardIds: string[] };

export function initialBoardGroups(page: CanvasPage): BoardGroup[] {
  return canvasRows(page).map((row, index) => ({
    name:
      row.boards[0]?.groupName ??
      (index === 0 ? page.title : `Group ${index + 1}`),
    boardIds: row.boards.map((board) => board.id),
  }));
}

export function restoreBoardGroups(
  page: CanvasPage,
  savedGroups?: BoardGroup[]
): BoardGroup[] {
  if (!savedGroups) return initialBoardGroups(page);
  const ids = new Set(page.boards.map((board) => board.id));
  const seen = new Set<string>();
  const groups = savedGroups
    .map((group) => ({
      ...group,
      boardIds: group.boardIds.filter((id) => {
        if (!ids.has(id) || seen.has(id)) return false;
        seen.add(id);
        return true;
      }),
    }))
    .filter((group) => group.boardIds.length > 0);
  if (!groups.length) return initialBoardGroups(page);
  const added = page.boards.filter((board) => !seen.has(board.id));
  const target = groups.find((group) => group.name === page.title) ?? groups.at(-1);
  target?.boardIds.push(...added.map((board) => board.id));
  return groups;
}

export function moveToGroup(
  groups: BoardGroup[],
  id: string,
  destination: string | number
): BoardGroup[] {
  const targetName = typeof destination === "string" ? destination.trim() : null;
  const targetIndex = typeof destination === "number"
    ? destination
    : groups.findIndex((group) => group.name === targetName);
  const sourceIndex = groups.findIndex((group) => group.boardIds.includes(id));
  if (
    sourceIndex < 0 || sourceIndex === targetIndex ||
    (typeof destination === "string" ? !targetName : !groups[targetIndex])
  ) {
    return groups;
  }
  const next = groups.map((group) => ({
    ...group,
    boardIds: group.boardIds.filter((boardId) => boardId !== id),
  }));
  const target = next[targetIndex];
  if (target) {
    target.boardIds.push(id);
  } else if (targetName) {
    next.push({ name: targetName, boardIds: [id] });
  }
  return next.filter((group) => group.boardIds.length > 0);
}

export function toggleGroupRow(groups: BoardGroup[], id: string): BoardGroup[] {
  const row = groups.findIndex((group) => group.boardIds.includes(id));
  const group = groups[row];
  if (!group) {
    return groups;
  }
  const column = group.boardIds.indexOf(id);
  const previous = groups[row - 1];
  if (column === 0 && previous) {
    return groups.flatMap((item, index) => {
      if (index === row) {
        return [];
      }
      if (index === row - 1) {
        return [{ ...item, boardIds: [...item.boardIds, ...group.boardIds] }];
      }
      return [item];
    });
  }
  if (column === 0) {
    return groups;
  }
  let number = groups.length + 1;
  while (groups.some((item) => item.name === `Group ${number}`)) {
    number += 1;
  }
  return groups.flatMap((item, index) =>
    index === row
      ? [
          { ...item, boardIds: item.boardIds.slice(0, column) },
          { name: `Group ${number}`, boardIds: item.boardIds.slice(column) },
        ]
      : [item]
  );
}
