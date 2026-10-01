"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { fileForPath } from "./files";
import { useStudioWorkspace } from "./LabShell";
import { isCanvasLayout } from "./layout-state";
import type { CanvasLayout } from "./layout-state";
import { dataHeaders, announceDataChange } from "./data/client";

export function useStoredLayout(pageId: string) {
  const { files } = useStudioWorkspace();
  const [initial, setInitial] = useState<CanvasLayout | null | undefined>(undefined);
  const [error, setError] = useState("");
  const [generation, setGeneration] = useState(0);
  const [retry, setRetry] = useState(0);
  const [conflict, setConflict] = useState(false);
  const endpoint = useRef("");
  const version = useRef(0);
  const last = useRef<CanvasLayout | null>(null);
  const blocked = useRef(false);
  const queue = useRef(Promise.resolve());
  const pending = useRef(0);
  const epoch = useRef(0);
  useEffect(() => {
    const file = fileForPath(window.location.pathname, files);
    if (!file) { setInitial(null); return; }
    const url = `/api/layouts?fileId=${encodeURIComponent(file.id)}&pageId=${encodeURIComponent(pageId)}`;
    endpoint.current = url;
    const currentEpoch = ++epoch.current;
    void fetch(url, { cache: "no-store" }).then(async (response) => {
      const value = await response.json();
      if (!response.ok || (value.layout !== null && !isCanvasLayout(value.layout))) throw new Error();
      if (epoch.current !== currentEpoch) return;
      version.current = value.revision;
      last.current = null;
      blocked.current = false;
      setInitial(value.layout);
      setGeneration((count) => count + 1);
      setConflict(false);
      setError("");
    }).catch(() => { if (epoch.current === currentEpoch) setError("Could not load the saved layout."); });
    return () => { epoch.current++; };
  }, [files, pageId, retry]);
  const save = useCallback((layout: CanvasLayout) => {
    const base = last.current;
    last.current = layout;
    if (!base || JSON.stringify(base) === JSON.stringify(layout) || !endpoint.current || blocked.current) return;
    const url = endpoint.current, currentEpoch = epoch.current;
    pending.current++;
    queue.current = queue.current.then(async () => {
      try {
        if (blocked.current || epoch.current !== currentEpoch) return;
        const response = await fetch(url, {
          method: "PUT", headers: dataHeaders(), body: JSON.stringify({ revision: version.current, base, layout }),
        });
        const result = await response.json();
        if (!response.ok) {
          if (response.status === 409) setConflict(true);
          throw new Error(result.error ?? "Layout was not saved.");
        }
        if (epoch.current !== currentEpoch) return;
        version.current = result.revision;
        setError("");
        announceDataChange();
        // A remote merge changes the starting state. Rebuild only after queued local edits finish.
        if (pending.current === 1 && JSON.stringify(result.layout) !== JSON.stringify(layout)) {
          last.current = null;
          setInitial(result.layout);
          setGeneration((count) => count + 1);
        }
      } catch (cause) {
        blocked.current = true;
        setError(cause instanceof Error ? cause.message : "Layout was not saved.");
      } finally { pending.current--; }
    });
  }, []);
  function download() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(last.current, null, 2)], { type: "application/json" }));
    const link = document.createElement("a"); link.href = url; link.download = `layout-${pageId}-unsaved.json`; link.click(); URL.revokeObjectURL(url);
  }
  return { initial, error, save, generation, conflict, download, retry: () => setRetry((value) => value + 1) };
}
