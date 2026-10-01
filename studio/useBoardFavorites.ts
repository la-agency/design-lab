"use client";

import { useCallback, useEffect, useState } from "react";

import { isDesignDecisions } from "./design-decisions";
import type { DesignDecision } from "./design-decisions";
import { announceDataChange, dataHeaders } from "./data/client";
import { fileForPath } from "./files";
import { useStudioWorkspace } from "./LabShell";

export function useBoardFavorites(pageId: string, active: boolean) {
  const { files } = useStudioWorkspace();
  const [decisions, setDecisions] = useState<DesignDecision[] | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [fileId, setFileId] = useState("");
  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/design-decisions", {
        cache: "no-store",
      });
      const value: unknown = await response.json();
      if (!response.ok || !isDesignDecisions(value)) {
        throw new Error("Read failed");
      }
      setDecisions(value);
      setError("");
    } catch {
      setError("Could not load favorites.");
    }
  }, []);
  useEffect(() => {
    if (!active) {
      return;
    }
    setFileId(fileForPath(window.location.pathname, files)?.id ?? "");
    void refresh();
    const onFocus = () => {
      void refresh();
    };
    window.addEventListener("focus", onFocus);
    window.addEventListener("studio-data-changed", onFocus);
    const timer = setInterval(() => { if (document.visibilityState === "visible") void refresh(); }, 5000);
    return () => { clearInterval(timer); window.removeEventListener("focus", onFocus); window.removeEventListener("studio-data-changed", onFocus); };
  }, [active, refresh, files]);

  const favorites = new Set(
    decisions
      ?.filter(
        (item) =>
          item.fileId === fileId && item.pageId === pageId && item.favorite
      )
      .map((item) => item.boardId)
  );

  async function toggle(board: { id: string; title: string }) {
    if (!fileId || saving || !decisions) {
      return;
    }
    setSaving(true);
    try {
      const source = new URL(window.location.href);
      source.searchParams.set("page", pageId);
      const version = board.id.match(/-v(\d+)$/u)?.[1];
      if (version) {
        source.searchParams.set("version", `v${version}`);
      } else {
        source.searchParams.delete("version");
      }
      source.hash = `board-${board.id}`;
      const response = await fetch("/api/design-decisions", {
        method: "PUT",
        headers: dataHeaders(),
        body: JSON.stringify({
          fileId,
          pageId,
          boardId: board.id,
          title: board.title,
          source: `${source.pathname}${source.search}${source.hash}`,
          favorite: !favorites.has(board.id),
          revision: decisions.find((item) => item.fileId === fileId && item.pageId === pageId && item.boardId === board.id)?.revision ?? 0,
        }),
      });
      const value: unknown = await response.json();
      if (!response.ok || !isDesignDecisions(value)) {
        if (response.status === 409) { await refresh(); throw new Error("This favorite changed elsewhere. The latest value is shown; choose again."); }
        throw new Error("Favorite was not saved. Please retry in the local Studio.");
      }
      setDecisions(value);
      setError("");
      announceDataChange();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Favorite was not saved.");
    } finally {
      setSaving(false);
    }
  }
  return {
    favorites,
    toggle,
    error,
    refresh,
    disabled: !decisions || !fileId || saving,
  };
}
