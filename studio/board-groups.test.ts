import { expect, test } from "vitest";

import {
  initialBoardGroups,
  moveToGroup,
  restoreBoardGroups,
  toggleGroupRow,
} from "./board-groups";
import { alignBoards } from "./auto-layout";
import { onboardingPages } from "./test-fixtures";
import type { CanvasPage } from "./types";

const groups = [
  { name: "AI & MCP", boardIds: ["v1", "v2", "v3"] },
  { name: "V2 iterations", boardIds: ["v4", "v5", "v6"] },
];

const page: CanvasPage = {
  id: "concepts",
  title: "Concepts",
  boards: ["v1", "v2", "v3"].map((id) => ({
    id, title: id, description: "", width: 640, height: 800,
  })),
};

test("restoring newly discovered versions appends them beside the saved board", () => {
  const saved = [{ name: "Concepts", boardIds: ["v1"] }];
  const restored = restoreBoardGroups(page, saved);
  expect(restored).toEqual([{ name: "Concepts", boardIds: ["v1", "v2", "v3"] }]);
  expect(saved).toEqual([{ name: "Concepts", boardIds: ["v1"] }]);
  const breaks = Object.fromEntries(restored.flatMap((group, row) =>
    group.boardIds.map((id, column) => [id, row > 0 && column === 0])
  ));
  const sizes = Object.fromEntries(page.boards.map((board) => [board.id, board]));
  expect(alignBoards(page, sizes, {}, breaks)).toEqual({
    v1: { x: 0, y: 0 }, v2: { x: 704, y: 0 }, v3: { x: 1408, y: 0 },
  });
  expect(restoreBoardGroups(page, restored)).toEqual(restored);
});

test("appends to the named row while preserving custom order and row splits", () => {
  expect(restoreBoardGroups(page, [
    { name: "Concepts", boardIds: ["v2"] },
    { name: "Selected", boardIds: ["v1"] },
  ])).toEqual([
    { name: "Concepts", boardIds: ["v2", "v3"] },
    { name: "Selected", boardIds: ["v1"] },
  ]);
});

test("appends to the last surviving row when the default group was renamed", () => {
  expect(restoreBoardGroups(page, [
    { name: "First", boardIds: ["v1"] },
    { name: "Second", boardIds: ["v2"] },
    { name: "Removed", boardIds: ["deleted"] },
  ])).toEqual([
    { name: "First", boardIds: ["v1"] },
    { name: "Second", boardIds: ["v2", "v3"] },
  ]);
});

test("removes stale and repeated board IDs without merging existing duplicate names", () => {
  expect(restoreBoardGroups(page, [
    { name: "Concepts", boardIds: ["deleted", "v2", "v2"] },
    { name: "Concepts", boardIds: ["v1", "v2"] },
  ])).toEqual([
    { name: "Concepts", boardIds: ["v2", "v3"] },
    { name: "Concepts", boardIds: ["v1"] },
  ]);
});

test("uses the page's explicit default rows when no saved boards survive", () => {
  const splitPage = { ...page, boards: page.boards.map((board) => ({
    ...board, newRow: board.id === "v2",
  })) };
  const expected = initialBoardGroups(splitPage);
  expect(restoreBoardGroups(splitPage)).toEqual(expected);
  expect(restoreBoardGroups(splitPage, [])).toEqual(expected);
  expect(restoreBoardGroups(splitPage, [{ name: "Old", boardIds: ["deleted"] }])).toEqual(expected);
});

test("selecting a different same-named row moves the board in either direction", () => {
  const duplicate = [
    { name: "Concepts", boardIds: ["v1"] },
    { name: "Concepts", boardIds: ["v2", "v3"] },
  ];
  expect(moveToGroup(duplicate, "v2", 0)).toEqual([
    { name: "Concepts", boardIds: ["v1", "v2"] },
    { name: "Concepts", boardIds: ["v3"] },
  ]);
  expect(moveToGroup(duplicate, "v1", 1)).toEqual([
    { name: "Concepts", boardIds: ["v2", "v3", "v1"] },
  ]);
  expect(duplicate[0]?.boardIds).toEqual(["v1"]);
  expect(moveToGroup(duplicate, "v2", 1)).toBe(duplicate);
  expect(moveToGroup(duplicate, "v2", 99)).toBe(duplicate);
  expect(moveToGroup(duplicate, "missing", 0)).toBe(duplicate);
  expect(moveToGroup(duplicate, "v2", "  ")).toBe(duplicate);
});

test("initial groups follow rows, not per-board idea metadata", () => {
  const page = onboardingPages[0];
  if (!page) {
    throw new Error("Missing fixture");
  }
  expect(initialBoardGroups(page)).toEqual([
    { name: page.title, boardIds: page.boards.map((board) => board.id) },
  ]);
});

test("moves a board into the destination row without splitting the old row", () => {
  expect(moveToGroup(groups, "v1", "V2 iterations")).toEqual([
    { name: "AI & MCP", boardIds: ["v2", "v3"] },
    { name: "V2 iterations", boardIds: ["v4", "v5", "v6", "v1"] },
  ]);
  expect(groups[0]?.boardIds).toEqual(["v1", "v2", "v3"]);
});

test("new groups create rows and empty rows disappear", () => {
  const next = moveToGroup(groups, "v1", "New direction");
  expect(next.at(-1)).toEqual({ name: "New direction", boardIds: ["v1"] });
  expect(moveToGroup(next, "v1", "AI & MCP")).toHaveLength(2);
});

test("splitting and joining rows also splits and merges their groups", () => {
  const split = toggleGroupRow(groups, "v2");
  expect(split.map((group) => group.boardIds)).toEqual([
    ["v1"],
    ["v2", "v3"],
    ["v4", "v5", "v6"],
  ]);
  expect(new Set(split.map((group) => group.name)).size).toBe(3);
  expect(toggleGroupRow(split, "v2")).toEqual(groups);
});
