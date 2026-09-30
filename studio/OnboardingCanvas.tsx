"use client";

import { Button } from "./ui/button";
import { Input } from "./ui/input";

import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Undo2,
  Redo2,
  AlignStartVertical,
  Grip,
  MoveDiagonal2,
  ChevronRight,
  Frame,
  Maximize2,
  Minus,
  Plus,
  RotateCcw,
  Scan,
  Star,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

import { alignBoards, canvasRows } from "./auto-layout";
import { isAnnotating } from "./preview-annotations";
import { BoardInspection, InspectionControls } from "./BoardInspection";
import {
  restoreBoardGroups,
  moveToGroup,
  toggleGroupRow,
} from "./board-groups";
import { boardNeighbours } from "./board-navigation";
import type { BoardDirection } from "./board-navigation";
import { CanvasHistory, useCanvasHistory, useUndoState } from "./CanvasHistory";
import { useLabTheme } from "./LabShell";
import type { CanvasLayout } from "./layout-state";
import { ResolutionControls } from "./ResolutionControls";
import type { BoardSize } from "./ResolutionControls";
import { snapBoard } from "./snap-board";
import type { SnapResult } from "./snap-board";
import type { BoardDefinition, CanvasPage } from "./types";
import { useBoardFavorites } from "./useBoardFavorites";
import { useBoardGesture } from "./useBoardGesture";
import type { BoardDelta } from "./useBoardGesture";
import { useStoredLayout } from "./useStoredLayout";

import styles from "./canvas.module.css";

export function CanvasStudy({
  pages,
  renderBoard,
  title = "Designs",
  initialPageId,
  onPageChange,
}: {
  pages: CanvasPage[];
  title?: string;
  initialPageId?: string;
  onPageChange?: (id: string) => void;
  renderBoard: (board: BoardDefinition) => ReactNode;
}) {
  const [pageId, setPageId] = useState(initialPageId ?? pages[0]?.id);
  const activePage = pages.find((page) => page.id === pageId) ?? pages[0];
  const [expandedPages, setExpandedPages] = useState<string[]>([
    initialPageId ?? pages[0]?.id ?? "",
  ]);
  const [focusTarget, setFocusTarget] = useState<{ id: string } | null>(null);
  useEffect(() => {
    if (!focusTarget) {
      return;
    }
    const frame = requestAnimationFrame(() =>
      window.dispatchEvent(
        new CustomEvent("design-canvas-focus", { detail: focusTarget.id })
      )
    );
    return () => cancelAnimationFrame(frame);
  }, [focusTarget, pageId]);
  function selectPage(id: string) {
    setPageId(id);
    setExpandedPages((current) =>
      current.includes(id) ? current : [...current, id]
    );
    onPageChange?.(id);
  }

  if (!activePage) {
    return null;
  }
  return (
    <main className={styles.studio}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarTitle}>
          <Frame size={16} /> {title}
        </div>
        <span className={styles.label}>Pages</span>
        <nav aria-label="Canvas pages" className={styles.pageTree}>
          {pages.map((page) => {
            const expanded = expandedPages.includes(page.id);
            return (
              <div key={page.id}>
                <div
                  className={styles.pageTreeRow}
                  data-active={page.id === activePage.id}
                >
                  <Button variant="ghost" size="sm"
                    type="button"
                    className={styles.pageDisclosure}
                    aria-label={`${expanded ? "Collapse" : "Expand"} ${page.title}`}
                    aria-expanded={expanded}
                    aria-controls={`page-boards-${page.id}`}
                    onClick={() =>
                      setExpandedPages((current) =>
                        expanded
                          ? current.filter((id) => id !== page.id)
                          : [...current, page.id]
                      )
                    }
                  >
                    <ChevronRight
                      size={14}
                      style={{
                        transform: expanded ? "rotate(90deg)" : undefined,
                      }}
                    />
                  </Button>
                  <Button variant="ghost" size="sm"
                    type="button"
                    className={styles.pageSelect}
                    title={page.title}
                    aria-current={
                      page.id === activePage.id ? "page" : undefined
                    }
                    onClick={() => selectPage(page.id)}
                  >
                    <span>{page.title}</span>
                    <small>{page.boards.length}</small>
                  </Button>
                </div>
                <div
                  id={`page-boards-${page.id}`}
                  hidden={!expanded}
                  className={styles.pageBoards}
                >
                  {page.boards.map((board) => (
                    <Button variant="ghost" size="sm"
                      className={styles.boardLink}
                      title={board.title}
                      type="button"
                      key={board.id}
                      aria-current={
                        page.id === activePage.id &&
                        focusTarget?.id === board.id
                          ? "location"
                          : undefined
                      }
                      onClick={() => {
                        selectPage(page.id);
                        setFocusTarget({ id: board.id });
                      }}
                    >
                      <Frame size={13} />
                      <span>{board.title}</span>
                    </Button>
                  ))}
                </div>
              </div>
            );
          })}
        </nav>
        <p className={styles.sidebarHint}>
          Drag boards anywhere.
          <br />
          Horizontal by default. New row when needed. Space + drag to pan.
        </p>
      </aside>
      {pages.map((page) => (
        <CanvasWorkspace
          key={`${page.id}:${page.boards.map((board) => board.id).join(",")}`}
          page={page}
          active={page.id === activePage.id}
          renderBoard={renderBoard}
        />
      ))}
    </main>
  );
}

type CanvasView = { x: number; y: number; zoom: number };

function CanvasWorkspace(props: {
  page: CanvasPage;
  active: boolean;
  renderBoard: (board: BoardDefinition) => ReactNode;
}) {
  const stored = useStoredLayout(props.page.id);
  if (stored.initial === undefined)
    return props.active ? (
      <div role="status">
        {stored.error || "Loading canvas…"}
        {stored.error && (
          <Button variant="ghost" size="sm" type="button" onClick={stored.retry}>
            Retry
          </Button>
        )}
      </div>
    ) : null;
  return (
    <>
      <CanvasHistory>
        <CanvasWorkspaceContent
          {...props}
          initialLayout={stored.initial}
          onLayoutChange={stored.save}
        />
      </CanvasHistory>
      {props.active && stored.error && (
        <div role="alert" className={styles.persistenceError}>
          {stored.error}
        </div>
      )}
    </>
  );
}

function CanvasWorkspaceContent({
  page,
  active,
  renderBoard,
  initialLayout,
  onLayoutChange,
}: {
  initialLayout: CanvasLayout | null;
  onLayoutChange: (layout: CanvasLayout) => void;
  page: CanvasPage;
  active: boolean;
  renderBoard: (board: BoardDefinition) => ReactNode;
}) {
  const history = useCanvasHistory();
  const favorites = useBoardFavorites(page.id, active);
  const theme = useLabTheme();
  const [canvasColour, setCanvasColour] = useUndoState<string | null>(
    initialLayout?.colour ?? null,
    "Change canvas colour"
  );
  const backgroundColour =
    canvasColour ?? (theme === "light" ? "#e5e5e5" : "#1e1e1e");
  const [sizes, setSizes] = useUndoState<Record<string, BoardSize>>(
    () =>
      Object.fromEntries(
        page.boards.map((board) => [
          board.id,
          initialLayout?.sizes[board.id] ?? {
            width: board.width,
            height: board.height,
          },
        ])
      ),
    "Change board size"
  );
  const [groups, setGroups] = useUndoState(
    () => restoreBoardGroups(page, initialLayout?.groups),
    "Change board group"
  );
  const groupOptions = groups.map((group, index) => ({
    value: index,
    label: groups.some((other, otherIndex) => otherIndex !== index && other.name === group.name)
      ? `${group.name} (row ${index + 1})`
      : group.name,
  }));
  const tags = Object.fromEntries(
    groups.flatMap((group) => group.boardIds.map((id) => [id, group.name]))
  );
  const rowBreaks = Object.fromEntries(
    groups.flatMap((group, row) =>
      group.boardIds.map((id, column) => [id, row > 0 && column === 0])
    )
  );
  const [measuredHeights, setMeasuredHeights] = useState<
    Record<string, number>
  >({});
  const [offsets, setOffsets] = useUndoState<Record<string, BoardDelta>>(
    initialLayout?.offsets ?? {},
    "Move boards"
  );
  useEffect(() => {
    onLayoutChange({ colour: canvasColour, sizes, groups, offsets });
  }, [canvasColour, sizes, groups, offsets, onLayoutChange]);
  const effectiveSizes = Object.fromEntries(
    page.boards.map((board) => [
      board.id,
      {
        ...(sizes[board.id] ?? board),
        height:
          measuredHeights[board.id] ?? sizes[board.id]?.height ?? board.height,
      },
    ])
  );
  const boardOrder = groups.flatMap((group) => group.boardIds);
  const layoutPage = {
    ...page,
    boards: boardOrder.flatMap((id) => {
      const board = page.boards.find((item) => item.id === id);
      return board ? [board] : [];
    }),
  };
  const ideas = canvasRows(layoutPage, rowBreaks);
  const aligned = alignBoards(layoutPage, effectiveSizes, tags, rowBreaks);
  const positions = Object.fromEntries(
    page.boards.map((board) => [
      board.id,
      {
        x: (aligned[board.id]?.x ?? 0) + (offsets[board.id]?.x ?? 0),
        y: (aligned[board.id]?.y ?? 0) + (offsets[board.id]?.y ?? 0),
      },
    ])
  );
  function changeTag(id: string, tag: string | number) {
    const next = moveToGroup(groups, id, tag);
    if (next === groups) {
      return;
    }
    setGroups(next);
    setOffsets({});
  }
  function resetLayout() {
    setOffsets({});
    setLayoutMessage("Layout reset to horizontal rows.");
  }
  const [layoutMessage, setLayoutMessage] = useState("");
  const [fullscreenId, setFullscreenId] = useState<string | null>(null);
  function showFullscreen(id: string | null) {
    const current =
      stage.current?.querySelector<HTMLDialogElement>("dialog:modal");
    current?.close();
    current?.show();
    if (id) {
      const next = document.getElementById(`board-${id}`);
      if (next instanceof HTMLDialogElement) {
        next.close();
        next.showModal();
      }
    }
    setFullscreenId(id);
  }

  const firstSize = sizes[page.boards[0]?.id ?? ""];
  const commonSize = page.boards.every(
    (board) =>
      sizes[board.id]?.width === firstSize?.width &&
      sizes[board.id]?.maxHeight === firstSize?.maxHeight
  )
    ? firstSize
    : undefined;
  const [view, setView] = useState<CanvasView>({ x: 36, y: 36, zoom: 0.6 });
  const [spaceHeld, setSpaceHeld] = useState(false);
  const [panning, setPanning] = useState(false);
  const viewport = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const drag = useRef<{ pointerId: number; x: number; y: number } | null>(null);

  function moveBoard(id: string, delta: BoardDelta) {
    setOffsets((current) => ({
      ...current,
      [id]: {
        x: (current[id]?.x ?? 0) + delta.x,
        y: (current[id]?.y ?? 0) + delta.y,
      },
    }));
    setLayoutMessage("Board moved. Reset layout to align into rows.");
  }

  function zoomAt(zoom: number, point?: { x: number; y: number }) {
    const element = viewport.current;
    if (!element) {
      return;
    }
    const anchor = point ?? {
      x: element.clientWidth / 2,
      y: element.clientHeight / 2,
    };
    setView((current) => {
      const next = Math.min(4, Math.max(0.02, zoom));
      const ratio = next / current.zoom;
      return {
        zoom: next,
        x: anchor.x - (anchor.x - current.x) * ratio,
        y: anchor.y - (anchor.y - current.y) * ratio,
      };
    });
  }

  const fitBoards = useCallback(() => {
    const area = viewport.current;
    const content = stage.current;
    if (!area || !content) {
      return;
    }
    const left = Math.min(
      0,
      ...Object.values(positions).map((position) => position.x)
    );
    const top = Math.min(
      0,
      ...Object.values(positions).map((position) => position.y - 48)
    );
    const width =
      Math.max(
        ...page.boards.map(
          (board) =>
            (positions[board.id]?.x ?? 0) +
            (sizes[board.id]?.width ?? board.width)
        )
      ) - left;
    const height =
      Math.max(
        ...page.boards.map(
          (board) =>
            (positions[board.id]?.y ?? 0) +
            (sizes[board.id]?.maxHeight ??
              measuredHeights[board.id] ??
              sizes[board.id]?.height ??
              board.height) +
            240
        )
      ) - top;
    const zoom = Math.min(
      1,
      Math.max(
        0.02,
        Math.min(
          (area.clientWidth - 72) / width,
          (area.clientHeight - 72) / height
        )
      )
    );
    setView({
      zoom,
      x: (area.clientWidth - width * zoom) / 2 - left * zoom,
      y: (area.clientHeight - height * zoom) / 2 - top * zoom,
    });
  }, [page.boards, positions, sizes, measuredHeights]);

  useEffect(() => {
    if (!active) {
      return;
    }
    const area = viewport.current;
    if (!area) {
      return;
    }
    function wheel(event: WheelEvent) {
      if (isAnnotating(document) || document.querySelector("dialog:modal")) {
        return;
      }
      if (scrollBoardControls(event)) {
        return;
      }
      event.preventDefault();
      const bounds = area?.getBoundingClientRect();
      if (!bounds) {
        return;
      }
      const unit = event.deltaMode === 1 ? 16 : 1;
      setView((current) => {
        if (!event.ctrlKey && !event.metaKey) {
          return {
            ...current,
            x:
              current.x - (event.shiftKey ? event.deltaY : event.deltaX) * unit,
            y: current.y - (event.shiftKey ? 0 : event.deltaY) * unit,
          };
        }
        const zoom = Math.min(
          4,
          Math.max(0.02, current.zoom * Math.exp(-event.deltaY * unit * 0.01))
        );
        const x = event.clientX - bounds.left;
        const y = event.clientY - bounds.top;
        return {
          zoom,
          x: x - ((x - current.x) * zoom) / current.zoom,
          y: y - ((y - current.y) * zoom) / current.zoom,
        };
      });
    }
    function focusBoard(event: Event) {
      if (!(event instanceof CustomEvent) || typeof event.detail !== "string") {
        return;
      }
      const board = document.getElementById(`board-${event.detail}`);
      if (!board || !stage.current?.contains(board)) {
        return;
      }
      const rect = board.getBoundingClientRect();
      const bounds = area?.getBoundingClientRect();
      if (!bounds) {
        return;
      }
      setView((current) => ({
        ...current,
        x:
          current.x +
          bounds.left +
          bounds.width / 2 -
          rect.left -
          rect.width / 2,
        y:
          current.y +
          bounds.top +
          Math.max(24, (bounds.height - rect.height) / 2) -
          rect.top,
      }));
    }
    window.addEventListener("design-canvas-focus", focusBoard);
    const location = new URL(window.location.href);
    const hash = location.hash.replace(/^#board-/u, "");
    const version = location.searchParams.get("version");
    const initialBoard = page.boards.find(
      (board) =>
        board.id === hash || (version && board.id.endsWith(`-${version}`))
    );
    const initialFrame = initialBoard
      ? requestAnimationFrame(() =>
          focusBoard(
            new CustomEvent("design-canvas-focus", { detail: initialBoard.id })
          )
        )
      : undefined;
    area.addEventListener("wheel", wheel, { passive: false, capture: true });
    return () => {
      if (initialFrame !== undefined) cancelAnimationFrame(initialFrame);
      area.removeEventListener("wheel", wheel, true);
      window.removeEventListener("design-canvas-focus", focusBoard);
    };
  }, [active]);

  useEffect(() => {
    if (!active) {
      return;
    }
    function focusCanvas() {
      viewport.current?.focus({ preventScroll: true });
    }
    function keydown(event: KeyboardEvent) {
      const { target } = event;
      if (
        event.defaultPrevented ||
        isAnnotating(document) ||
        (target instanceof HTMLElement &&
          target.closest('[role="combobox"], [role="listbox"]'))
      ) {
        return;
      }
      if (
        (event.metaKey || event.ctrlKey) &&
        (event.code === "KeyZ" || event.code === "KeyY")
      ) {
        if (
          target instanceof HTMLElement &&
          target.closest("input, textarea, [contenteditable=true]")
        ) {
          return;
        }
        event.preventDefault();
        focusCanvas();
        if (event.shiftKey || event.code === "KeyY") {
          history.redo();
        } else {
          history.undo();
        }
        return;
      }
      if (
        document.querySelector("dialog:modal") ||
        (target instanceof HTMLElement &&
          (target.isContentEditable ||
            target.closest("input, textarea, select")))
      ) {
        return;
      }
      if (isCanvasNavigation(event)) {
        focusCanvas();
      }
      if (event.code === "Space") {
        event.preventDefault();
        setSpaceHeld(true);
        return;
      }
      if (event.shiftKey && event.code === "Digit1") {
        event.preventDefault();
        fitBoards();
        return;
      }
      if (["Digit0", "Numpad0"].includes(event.code)) {
        event.preventDefault();
        zoomAt(1);
        return;
      }
      if (
        ["Equal", "Minus", "NumpadAdd", "NumpadSubtract"].includes(event.code)
      ) {
        event.preventDefault();
        zoomAt(
          view.zoom *
            (["Minus", "NumpadSubtract"].includes(event.code) ? 1 / 1.2 : 1.2)
        );
      }
    }
    function releaseSpace(event: KeyboardEvent) {
      if (event.code === "Space") {
        setSpaceHeld(false);
      }
    }
    function blur() {
      setSpaceHeld(false);
      setPanning(false);
      drag.current = null;
    }
    window.addEventListener("keydown", keydown);
    window.addEventListener("keyup", releaseSpace);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", keydown);
      window.removeEventListener("keyup", releaseSpace);
      window.removeEventListener("blur", blur);
    };
  }, [active, view.zoom, history, positions, sizes, fitBoards]);

  return (
    <section
      className={styles.workspace}
      hidden={!active}
      aria-label={page.title}
    >
      <span className={styles.srOnly} aria-live="polite">
        {layoutMessage}
      </span>
      {favorites.error && (
        <div role="alert" className={styles.favoriteError}>
          {favorites.error}
          <Button variant="ghost" size="sm"
            type="button"
            onClick={() => {
              void favorites.refresh();
            }}
          >
            Retry
          </Button>
        </div>
      )}
      <header className={styles.toolbar}>
        <div>
          <strong>{page.title}</strong>
          <span>{page.boards.length} boards</span>
        </div>
        <div className={styles.zoom}>
          <label className={styles.canvasColour} title="Canvas colour">
            <Input
              type="color"
              aria-label="Canvas colour"
              value={backgroundColour}
              onChange={(event) => setCanvasColour(event.target.value)}
            />
            Canvas
          </label>
          {canvasColour !== null && (
            <Button variant="ghost" size="sm"
              type="button"
              aria-label="Reset canvas colour"
              title="Reset canvas colour"
              onClick={() => setCanvasColour(null)}
            >
              <RotateCcw size={14} />
            </Button>
          )}
          <Button variant="ghost" size="sm"
            type="button"
            aria-label="Fit all boards"
            title="Fit all boards (Shift + 1)"
            onClick={fitBoards}
          >
            <Scan size={15} />
          </Button>
          <Button variant="ghost" size="sm"
            type="button"
            aria-label="Zoom out"
            title="Zoom out (−)"
            disabled={view.zoom <= 0.02}
            onClick={() => zoomAt(view.zoom / 1.2)}
          >
            <Minus size={15} />
          </Button>
          <Button variant="ghost" size="sm"
            type="button"
            onClick={() => zoomAt(1)}
            title="Reset zoom to 100% (Shift + 0)"
            aria-label={`Zoom ${Math.round(view.zoom * 100)}%. Reset to 100%`}
          >
            {Math.round(view.zoom * 100)}%
          </Button>
          <Button variant="ghost" size="sm"
            type="button"
            aria-label="Zoom in"
            title="Zoom in (+)"
            disabled={view.zoom >= 4}
            onClick={() => zoomAt(view.zoom * 1.2)}
          >
            <Plus size={15} />
          </Button>
        </div>
      </header>
      <div className={styles.pageResolution}>
        <strong>All boards</strong>
        <ResolutionControls
          label={`all boards on ${page.title}`}
          size={commonSize}
          maxHeight={
            page.boards.every(
              (board) => sizes[board.id]?.maxHeight === firstSize?.maxHeight
            )
              ? firstSize?.maxHeight
              : undefined
          }
          onMaxHeightChange={(maxHeight) =>
            setSizes((current) =>
              Object.fromEntries(
                page.boards.map((board) => [
                  board.id,
                  { ...(current[board.id] ?? board), maxHeight },
                ])
              )
            )
          }
          onChange={(size) =>
            setSizes(
              Object.fromEntries(page.boards.map((board) => [board.id, size]))
            )
          }
        />
        <div className={styles.historyControls}>
          <Button variant="ghost" size="sm"
            type="button"
            onClick={history.undo}
            disabled={!history.undoLabel}
            title={`Undo${history.undoLabel ? `: ${history.undoLabel}` : ""} (⌘/Ctrl Z)`}
          >
            <Undo2 size={15} /> Undo
          </Button>
          <Button variant="ghost" size="sm"
            type="button"
            onClick={history.redo}
            disabled={!history.redoLabel}
            title="Redo (⌘/Ctrl Shift Z)"
          >
            <Redo2 size={15} /> Redo
          </Button>
          <Button variant="ghost" size="sm"
            type="button"
            onClick={resetLayout}
            title="Align boards horizontally with explicit row breaks"
          >
            <AlignStartVertical size={15} /> Reset layout
          </Button>
        </div>
      </div>

      <div
        ref={viewport}
        tabIndex={-1}
        aria-label="Design canvas"
        className={styles.viewport}
        data-hand={spaceHeld}
        data-panning={panning}
        style={{
          backgroundColor: backgroundColour,
        }}
        onPointerDownCapture={(event) => {
          if (event.target instanceof Element && event.target.closest("[data-design-inspector]")) return;
          if (isAnnotating(document) || document.querySelector("dialog:modal")) {
            return;
          }
          const background =
            event.target === viewport.current ||
            event.target === stage.current ||
            (event.target instanceof Element &&
              event.target.closest(`.${styles.boardSurface}`) !== null &&
              !event.target.closest(
                "button, a, input, textarea, select, summary, [contenteditable=true], [role=button], [role=slider]"
              ));
          if (
            event.button !== 1 &&
            !(event.button === 0 && (spaceHeld || background))
          ) {
            return;
          }
          event.preventDefault();
          event.stopPropagation();
          event.currentTarget.setPointerCapture(event.pointerId);
          drag.current = {
            pointerId: event.pointerId,
            x: event.clientX,
            y: event.clientY,
          };
          setPanning(true);
        }}
        onPointerMove={(event) => {
          const previous = drag.current;
          if (!previous || previous.pointerId !== event.pointerId) {
            return;
          }
          setView((current) => ({
            ...current,
            x: current.x + event.clientX - previous.x,
            y: current.y + event.clientY - previous.y,
          }));
          drag.current = {
            pointerId: event.pointerId,
            x: event.clientX,
            y: event.clientY,
          };
        }}
        onPointerUp={(event) => {
          if (drag.current?.pointerId !== event.pointerId) {
            return;
          }
          drag.current = null;
          setPanning(false);
          event.currentTarget.releasePointerCapture(event.pointerId);
        }}
        onPointerCancel={() => {
          drag.current = null;
          setPanning(false);
        }}
        onLostPointerCapture={() => {
          drag.current = null;
          setPanning(false);
        }}
        onClickCapture={(event) => {
          if (spaceHeld) {
            event.preventDefault();
            event.stopPropagation();
          }
        }}
        onAuxClick={(event) => {
          if (event.button === 1) {
            event.preventDefault();
          }
        }}
      >
        <div
          ref={stage}
          className={styles.boardRow}
          style={{
            transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom})`,
          }}
        >
          {layoutPage.boards.map((board) => (
            <LiveBoard
              key={board.id}
              board={board}
              favorite={favorites.favorites.has(board.id)}
              favoriteDisabled={favorites.disabled}
              favoriteError={favorites.error}
              onFavorite={() => {
                void favorites.toggle(board);
              }}
              newRow={rowBreaks[board.id] ?? board.newRow ?? false}
              onNewRow={() => {
                setGroups((current) => toggleGroupRow(current, board.id));
                setOffsets({});
              }}
              onHeight={(height) =>
                setMeasuredHeights((current) =>
                  current[board.id] === height
                    ? current
                    : { ...current, [board.id]: height }
                )
              }
              fullscreen={fullscreenId === board.id}
              onFullscreen={showFullscreen}
              neighbours={boardNeighbours(ideas, board.id)}
              zoom={view.zoom}
              position={positions[board.id] ?? { x: 0, y: 0 }}
              tag={tags[board.id] ?? board.id}
              groupIndex={groups.findIndex((group) => group.boardIds.includes(board.id))}
              groupOptions={groupOptions}
              onTagChange={(tag) => changeTag(board.id, tag)}
              snap={(delta) => {
                const rects = page.boards.map((item) => {
                  const bounds = document
                    .getElementById(`board-${item.id}`)
                    ?.getBoundingClientRect();
                  return {
                    id: item.id,
                    ...(positions[item.id] ?? { x: 0, y: 0 }),
                    width: sizes[item.id]?.width ?? item.width,
                    height: bounds ? bounds.height / view.zoom : item.height,
                  };
                });
                const current = rects.find((item) => item.id === board.id);
                return current
                  ? snapBoard(
                      current,
                      delta,
                      aligned[board.id] ?? current,
                      rects.filter((item) => item.id !== board.id),
                      view.zoom
                    )
                  : { delta };
              }}
              onMove={(delta) => moveBoard(board.id, delta)}
              size={sizes[board.id] ?? board}
              setSize={(size) =>
                setSizes((current) => ({ ...current, [board.id]: size }))
              }
            >
              {renderBoard(board)}
            </LiveBoard>
          ))}
        </div>
      </div>
    </section>
  );
}

function LiveBoard({
  favoriteError,
  favorite,
  favoriteDisabled,
  onFavorite,
  snap,
  newRow,
  onNewRow,
  onHeight,
  fullscreen,
  onFullscreen,
  neighbours,
  position,
  tag,
  groupIndex,
  groupOptions,
  onTagChange,
  onMove,
  size,
  setSize,
  board,
  children,
  zoom,
}: {
  favorite: boolean;
  favoriteError: string;
  favoriteDisabled: boolean;
  onFavorite: () => void;
  snap: (delta: BoardDelta) => SnapResult;
  newRow: boolean;
  onNewRow: () => void;
  onHeight: (height: number) => void;
  fullscreen: boolean;
  onFullscreen: (id: string | null) => void;
  neighbours: Partial<Record<BoardDirection, string>>;
  position: BoardDelta;
  tag: string;
  groupIndex: number;
  groupOptions: { value: number; label: string }[];
  onTagChange: (tag: string | number) => void;
  onMove: (delta: BoardDelta) => void;
  size: BoardSize;
  setSize: (size: BoardSize) => void;
  board: BoardDefinition;
  children: ReactNode;
  zoom: number;
}) {
  const [addingTag, setAddingTag] = useState(false);
  const [offset, setOffset] = useState<BoardDelta | null>(null);
  const [resize, setResize] = useState<BoardDelta | null>(null);
  const [guides, setGuides] = useState<SnapResult | null>(null);
  const moveGesture = useBoardGesture({
    zoom,
    onPreview: (delta) => {
      const result = delta ? snap(delta) : null;
      setOffset(result?.delta ?? null);
      setGuides(result);
    },
    onCommit: (delta) => onMove(snap(delta).delta),
  });
  const resizeGesture = useBoardGesture({
    zoom,
    onPreview: setResize,
    onCommit: (delta) => setSize(resizedBoard(size, delta)),
  });
  const previewSize = resize ? resizedBoard(size, resize) : size;
  const [revision, setRevision] = useUndoState(0, "Restart design");
  const revisions = useRef([0]);
  const nextRevision = useRef(0);
  const frame = useRef<HTMLDialogElement>(null);
  const expand = useRef<HTMLButtonElement>(null);
  const surface = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (fullscreen) {
      frame.current?.focus({ preventScroll: true });
    }
  }, [fullscreen]);

  useEffect(() => {
    if (fullscreen || !surface.current) {
      return;
    }
    const observer = new ResizeObserver(() => {
      if (surface.current) {
        onHeight(
          Math.ceil(surface.current.getBoundingClientRect().height / zoom)
        );
      }
    });
    observer.observe(surface.current);
    return () => observer.disconnect();
  }, [fullscreen, onHeight, zoom]);

  function closeFullscreen() {
    onFullscreen(null);
    expand.current?.focus({ preventScroll: true });
  }
  function toggleFullscreen() {
    if (fullscreen) {
      closeFullscreen();
      return;
    }
    onFullscreen(board.id);
  }
  return (
    <BoardInspection resetKey={`${size.width}-${size.maxHeight}-${revision}-${fullscreen}`}>
    <dialog
      open
      tabIndex={-1}
      data-fullscreen={fullscreen}
      data-moving={offset !== null}
      onKeyDown={(event) => {
        if (
          !fullscreen ||
          event.defaultPrevented ||
          event.metaKey ||
          event.ctrlKey ||
          event.altKey ||
          event.shiftKey
        ) {
          return;
        }
        if (
          event.target instanceof HTMLElement &&
          event.target.closest(
            "input, textarea, select, [contenteditable=true], [role=slider], [role=tablist], [role=menu], [role=radio]"
          )
        ) {
          return;
        }
        if (
          !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(
            event.key
          )
        ) {
          return;
        }
        event.preventDefault();
        const target = neighbours[event.key as BoardDirection];
        if (target) {
          onFullscreen(target);
        }
      }}
      onCancel={(event) => {
        event.preventDefault();
        closeFullscreen();
      }}
      id={`board-${board.id}`}
      ref={frame}
      className={styles.board}
      style={{
        width: size.width,
        transform:
          !fullscreen && offset
            ? `translate(${offset.x}px, ${offset.y}px)`
            : undefined,
        left: fullscreen ? undefined : position.x,
        top: fullscreen ? undefined : position.y,
      }}
      aria-label={board.title}
    >
      <SnapGuides guides={guides} position={position} size={size} zoom={zoom} />
      <header className={styles.boardHeader}>
        {fullscreen ? (
          <div className={styles.fullscreenHeading}>
            <nav
              aria-label="Navigate fullscreen designs"
              className={styles.fullscreenNavigation}
            >
              {(
                [
                  {
                    key: "ArrowLeft",
                    label: "Previous iteration",
                    Icon: ArrowLeft,
                  },
                  {
                    key: "ArrowRight",
                    label: "Next iteration",
                    Icon: ArrowRight,
                  },
                  { key: "ArrowUp", label: "Previous row", Icon: ArrowUp },
                  { key: "ArrowDown", label: "Next row", Icon: ArrowDown },
                ] as const
              ).map(({ key, label, Icon }) => (
                <Button variant="ghost" size="sm"
                  key={key}
                  type="button"
                  aria-label={label}
                  title={`${label} (${key.replace("Arrow", "")} arrow)`}
                  disabled={!neighbours[key]}
                  onClick={() => {
                    const target = neighbours[key];
                    if (target) {
                      onFullscreen(target);
                    }
                  }}
                >
                  <Icon size={16} />
                </Button>
              ))}
            </nav>
          </div>
        ) : (
          <Button variant="ghost" size="sm"
            type="button"
            className={styles.dragTitle}
            aria-label={`Move ${board.title}`}
            title="Drag anywhere · Escape to cancel · Reset layout to align into rows"
            {...moveGesture}
            onKeyDown={(event) => {
              moveGesture.onKeyDown(event);
              const amount = event.shiftKey ? 100 : 10;
              const directions: Record<string, BoardDelta> = {
                ArrowLeft: { x: -amount, y: 0 },
                ArrowRight: { x: amount, y: 0 },
                ArrowUp: { x: 0, y: -amount },
                ArrowDown: { x: 0, y: amount },
              };
              const delta = directions[event.key];
              if (delta) {
                event.preventDefault();
                onMove(delta);
              }
            }}
          >
            <Grip size={16} />
            <span></span>
          </Button>
        )}
        {!fullscreen && (
          <div className={styles.ideaTag}>
            {addingTag ? (
              <Input
                className="h-9 text-xs md:text-xs"
                aria-label={`New group for ${board.title}`}
                autoFocus
                placeholder="New group"
                onBlur={(event) => {
                  onTagChange(event.currentTarget.value);
                  setAddingTag(false);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.currentTarget.blur();
                  }
                  if (event.key === "Escape") {
                    setAddingTag(false);
                  }
                }}
              />
            ) : (
                <Select
                  value={String(groupIndex)}
                  onValueChange={(value) => {
                    if (value === "new-group") {
                      setAddingTag(true);
                      return;
                    }
                    onTagChange(Number(value));
                  }}
                >
                  <SelectTrigger className="w-full min-w-0 text-xs" aria-label={`Group for ${board.title}`} title={tag}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent position="popper" align="start" onCloseAutoFocus={(event) => {
                    // The new-group input takes focus when it replaces the trigger.
                    if (addingTag) event.preventDefault();
                  }}>
                    {groupOptions.map(({ value, label }) => (
                      <SelectItem key={value} value={String(value)}>{label}</SelectItem>
                    ))}
                    <SelectItem value="new-group">New group…</SelectItem>
                  </SelectContent>
                </Select>
            )}
          </div>
        )}
        <Button variant="ghost" size="sm"
          type="button"
          className={styles.favoriteButton}
          aria-label={`Favorite ${board.title}`}
          aria-pressed={favorite}
          disabled={favoriteDisabled}
          title={favorite ? "Remove favorite" : "Favorite for assembly"}
          onClick={onFavorite}
        >
          <Star size={18} fill={favorite ? "currentColor" : "none"} />
        </Button>
        {board.exportUrl && (
          <>
            <Button asChild variant="outline" size="sm">
              <a href={board.exportUrl} title="Download email HTML">HTML</a>
            </Button>
            <Button asChild variant="outline" size="sm">
              <a href={`${board.exportUrl}?format=text`} title="Download plain text">Text</a>
            </Button>
          </>
        )}
        <Button variant="ghost" size="sm"
          type="button"
          ref={expand}
          onClick={toggleFullscreen}
          aria-label={
            fullscreen
              ? `Exit fullscreen ${board.title}`
              : `Fullscreen ${board.title}`
          }
          title={fullscreen ? "Exit fullscreen (Esc)" : "Experience fullscreen"}
        >
          {fullscreen ? <X size={18} /> : <Maximize2 size={18} />}
        </Button>
      </header>
      {fullscreen && favoriteError && (
        <p role="alert" className={styles.favoriteError}>
          {favoriteError}
        </p>
      )}
      {!fullscreen && (
        <div className={styles.boardControls}>
          {!fullscreen && (
            <Button variant="ghost" size="sm"
              type="button"
              aria-label={`Start new row at ${board.title}`}
              aria-pressed={newRow}
              onClick={onNewRow}
            >
              {newRow ? "Join row" : "New row"}
            </Button>
          )}

          {!fullscreen && (
            <ResolutionControls
              label={board.title}
              size={size}
              onChange={setSize}
            />
          )}
          <Button variant="ghost" size="sm"
            type="button"
            aria-label={`Reset ${board.title}`}
            title="Restart demo"
            onClick={() => {
              nextRevision.current += 1;
              revisions.current.push(nextRevision.current);
              setRevision(nextRevision.current);
            }}
          >
            <RotateCcw size={14} />
          </Button>
        </div>
      )}
      <div className={styles.surfaceFrame}>
        <div
          ref={surface}
          className={styles.boardSurface}
          data-height-capped={size.maxHeight !== undefined}
          style={surfaceSize(size, fullscreen)}
        >
          {revisions.current.map((version) => (
            <div
              className={styles.designRevision}
              hidden={version !== revision}
              key={version}
            >
              {children}
            </div>
          ))}
        </div>
        {!fullscreen && (
          <>
            {resize && (
              <div
                className={styles.resizePreview}
                style={{ width: previewSize.width, height: previewSize.height }}
              >
                <span>
                  {previewSize.width} × {previewSize.height}
                </span>
              </div>
            )}
            <Button variant="ghost" size="sm"
              type="button"
              className={styles.resizeHandle}
              aria-label={`Drag to resize ${board.title}`}
              title="Drag to resize · Escape to cancel"
              {...resizeGesture}
            >
              <MoveDiagonal2 size={18} />
            </Button>
          </>
        )}
      </div>
      {!fullscreen && (
        <footer className={styles.boardFooter}>
          <span>
            {size.width}px ·{" "}
            {size.maxHeight ? `max ${size.maxHeight}px` : "Full height"}
          </span>
          {board.preview && <InspectionControls title={board.title} />}
        </footer>
      )}
    </dialog>
    </BoardInspection>
  );
}

function resizedBoard(size: BoardSize, delta: BoardDelta): BoardSize {
  return {
    width: Math.min(7680, Math.max(240, Math.round(size.width + delta.x))),
    height: size.height,
    maxHeight:
      size.maxHeight === undefined
        ? undefined
        : Math.min(7680, Math.max(240, Math.round(size.maxHeight + delta.y))),
  };
}

function surfaceSize(size: BoardSize, fullscreen: boolean) {
  if (fullscreen) {
    return {};
  }
  return size.maxHeight === undefined ? {} : { height: size.maxHeight };
}

function isCanvasNavigation(event: KeyboardEvent) {
  return (
    [
      "Space",
      "Digit0",
      "Numpad0",
      "Equal",
      "Minus",
      "NumpadAdd",
      "NumpadSubtract",
    ].includes(event.code) ||
    (event.shiftKey && event.code === "Digit1")
  );
}

function SnapGuides({
  guides,
  position,
  size,
  zoom,
}: {
  guides: SnapResult | null;
  position: BoardDelta;
  size: BoardSize;
  zoom: number;
}) {
  if (!guides) {
    return null;
  }
  const x = (guides.x ?? 0) - position.x - guides.delta.x;
  const y = (guides.y ?? 0) - position.y - guides.delta.y;
  return (
    <svg className={styles.snapGuides} aria-hidden="true">
      {guides.x !== undefined && (
        <line x1={x} x2={x} y1={-80 / zoom} y2={size.height + 80 / zoom} />
      )}
      {guides.y !== undefined && (
        <line y1={y} y2={y} x1={-80 / zoom} x2={size.width + 80 / zoom} />
      )}
    </svg>
  );
}

function scrollBoardControls(event: WheelEvent) {
  if (event.ctrlKey || event.metaKey || !(event.target instanceof Element)) {
    return false;
  }
  const controls = event.target.closest<HTMLElement>(
    `.${styles.boardControls}`
  );
  const horizontal = event.shiftKey ? event.deltaY : event.deltaX;
  if (
    !controls ||
    controls.scrollWidth <= controls.clientWidth ||
    !horizontal
  ) {
    return false;
  }
  event.preventDefault();
  controls.scrollLeft += horizontal * (event.deltaMode === 1 ? 16 : 1);
  return true;
}
