"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Folder, MessageSquare, X } from "lucide-react";
import type { StudioFile } from "../types";
import type { Entity } from "./database";
import type { Collection, Comment, Feedback } from "./model";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { announceDataChange, dataHeaders } from "./client";
import { CollectionItem } from "./CollectionItem";
import styles from "./review.module.css";

type History = { sequence: number; actor: string; kind: string; id: string; revision: number; at: string };
type State = { records: Entity[]; history: History[]; writable: boolean };
type Anchor = { boardId: string; selector: string; selectedText: string; sourceRevision?: string };
export function ReviewPanel({ file }: { file: StudioFile }) {
  const [view, setView] = useState<"feedback" | "collections" | "history" | null>(null);
  const [state, setState] = useState<State | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const boards = file.pages?.flatMap((page) => page.boards) ?? [];
  const [anchor, setAnchor] = useState<Anchor>({ boardId: boards[0]?.id ?? "", selector: "", selectedText: "" });
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [showResolved, setShowResolved] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const historyCursor = useRef(0);
  const retryRequest = useRef<{ body: string; id: string } | null>(null);
  const refresh = useCallback(async () => {
    const response = await fetch(`/api/workspace?fileId=${encodeURIComponent(file.id)}&after=${historyCursor.current}`, { cache: "no-store" });
    if (!response.ok) throw new Error("Could not load workspace data.");
    const next: State = await response.json();
    historyCursor.current = Math.max(historyCursor.current, next.history.at(-1)?.sequence ?? 0);
    setState((previous) => ({ ...next, history: Array.from(new Map([...(previous?.history ?? []), ...next.history].map((event) => [event.sequence, event])).values()).sort((a, b) => a.sequence - b.sequence) }));
  }, [file.id]);
  useEffect(() => {
    function selected(event: Event) {
      const detail = (event as CustomEvent<Anchor>).detail;
      if (!boards.some((board) => board.id === detail.boardId)) return;
      setAnchor(detail); setView("feedback");
    }
    window.addEventListener("studio-feedback-target", selected);
    return () => window.removeEventListener("studio-feedback-target", selected);
  }, [boards]);
  useEffect(() => {
    if (!view) return;
    function update() { if (document.visibilityState === "visible") void refresh().catch((cause: Error) => setError(cause.message)); }
    update();
    const timer = setInterval(update, 5000);
    window.addEventListener("focus", update);
    window.addEventListener("studio-data-changed", update);
    return () => { clearInterval(timer); window.removeEventListener("focus", update); window.removeEventListener("studio-data-changed", update); };
  }, [view, refresh]);
  async function command(input: Record<string, unknown>): Promise<boolean> {
    setBusy(true); setError("");
    try {
      const encoded = JSON.stringify(input);
      if (retryRequest.current?.body !== encoded) retryRequest.current = { body: encoded, id: crypto.randomUUID() };
      const response = await fetch("/api/workspace", { method: "POST", headers: dataHeaders(retryRequest.current.id), body: encoded });
      const result = await response.json();
      if (!response.ok) { if (response.status === 409) await refresh(); throw new Error(result.error ?? "Could not save."); }
      retryRequest.current = null;
      await refresh().catch(() => setError("Saved. Reopen review to refresh the list."));
      announceDataChange(); return true;
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save. Your text is still here."); return false; }
    finally { setBusy(false); }
  }
  function close() { setView(null); trigger.current?.focus(); }
  const feedback = state?.records.filter((item) => item.kind === "feedback") as Entity<Feedback>[] | undefined;
  const comments = state?.records.filter((item) => item.kind === "comment") as Entity<Comment>[] | undefined;
  const collections = state?.records.filter((item) => item.kind === "collection") as Entity<Collection>[] | undefined;
  const disabled = busy || !state?.writable;
  return <>
    <div className={styles.launchers}>
      <Button ref={trigger} variant="ghost" size="sm" onClick={() => setView("feedback")}><MessageSquare size={14} /> Feedback</Button>
      <Button variant="ghost" size="sm" onClick={() => setView("collections")}><Folder size={14} /> Collections</Button>
    </div>
    {view && createPortal(<aside className={styles.panel} aria-label="Design review" onKeyDown={(event) => { event.stopPropagation(); if (event.key === "Escape") close(); }}>
      <header className={styles.header}><h2>{file.title}</h2><Button variant="ghost" size="icon-sm" aria-label="Close review" onClick={close}><X size={16} /></Button></header>
      <nav className={styles.actions} aria-label="Review views">
        {(["feedback", "collections", "history"] as const).map((item) => <Button key={item} size="sm" variant={view === item ? "secondary" : "ghost"} aria-pressed={view === item} onClick={() => setView(item)}>{item[0].toUpperCase() + item.slice(1)}</Button>)}
      </nav>
      {error && <p role="alert" className={styles.error}>{error}</p>}
      {!state ? <p role="status">Loading review…</p> : <>
        {!state.writable && <p>Read-only preview</p>}
        {view === "feedback" && <>
          <form className={styles.form} onSubmit={async (event) => {
            event.preventDefault();
            if (await command({ type: "feedback.add", fileId: file.id, sourceRevision: boards.find((board) => board.id === anchor.boardId)?.preview, ...anchor, body: message })) { setMessage(""); setAnchor({ ...anchor, selector: "", selectedText: "" }); }
          }}>
            <Select value={anchor.boardId} onValueChange={(boardId) => setAnchor({ boardId, selector: "", selectedText: "" })}>
              <SelectTrigger aria-label="Feedback board"><SelectValue /></SelectTrigger>
              <SelectContent>{boards.map((board) => <SelectItem key={board.id} value={board.id}>{board.title}</SelectItem>)}</SelectContent>
            </Select>
            {anchor.selector && <div className={styles.context}><span>{anchor.selectedText || anchor.selector}</span><Button type="button" size="sm" variant="ghost" onClick={() => setAnchor({ ...anchor, selector: "", selectedText: "" })}>Clear selection</Button></div>}
            <Textarea aria-label="Feedback" placeholder="What should change?" value={message} maxLength={10000} onChange={(event) => setMessage(event.target.value)} disabled={!state.writable} />
            <Button size="sm" disabled={disabled || !message.trim() || !anchor.boardId}>Add feedback</Button>
          </form>
          <Button variant="ghost" size="sm" aria-pressed={showResolved} onClick={() => setShowResolved(!showResolved)}>{showResolved ? "Hide resolved" : "Show resolved"}</Button>
          {!feedback?.some((item) => showResolved || !item.value.resolved) && <p className={styles.muted}>No open feedback.</p>}
          {feedback?.filter((item) => showResolved || !item.value.resolved).map((item) => <FeedbackThread key={item.id} item={item} comments={comments?.filter((comment) => comment.value.threadId === item.id) ?? []} boardTitle={boards.find((board) => board.id === item.value.boardId)?.title ?? item.value.boardId} outdated={boards.find((board) => board.id === item.value.boardId)?.preview !== item.value.sourceRevision} disabled={disabled} command={command} />)}
        </>}
        {view === "collections" && <>
          <form className={styles.actions} onSubmit={async (event) => { event.preventDefault(); if (await command({ type: "collection.create", fileId: file.id, name })) setName(""); }}>
            <Input aria-label="Collection name" placeholder="Collection name" value={name} maxLength={120} onChange={(event) => setName(event.target.value)} disabled={!state.writable} />
            <Button size="sm" disabled={disabled || !name.trim()}>Create</Button>
          </form>
          {!collections?.length && <p className={styles.muted}>No collections yet.</p>}
          {collections?.map((item) => <CollectionItem key={item.id} item={item} boards={boards} command={command} disabled={disabled} />)}
        </>}
        {view === "history" && <>
          <div className={styles.actions}><span>Workspace history</span><Button asChild variant="outline" size="sm"><a href="/api/workspace?export=json" download>Export data</a></Button></div>
          {state.history.length === 0 && <p className={styles.muted}>No changes yet.</p>}
          {state.history.slice().reverse().map((event) => <article key={event.sequence} className={styles.event}><strong>{event.kind} · revision {event.revision}</strong><span>{event.actor} · {new Date(event.at).toLocaleString()}</span><small>{event.id}</small></article>)}
          {state.history.length >= 200 && <Button size="sm" variant="outline" onClick={async () => {
            const response = await fetch(`/api/workspace?fileId=${encodeURIComponent(file.id)}&after=${state.history.at(-1)?.sequence ?? 0}`);
            if (response.ok) { const more: State = await response.json(); historyCursor.current = Math.max(historyCursor.current, more.history.at(-1)?.sequence ?? 0); setState({ ...more, history: Array.from(new Map([...state.history, ...more.history].map((event) => [event.sequence, event])).values()) }); }
          }}>Load more history</Button>}
        </>}
      </>}
    </aside>, document.querySelector("[data-studio-shell]") ?? document.body)}
  </>;
}
function FeedbackThread({ item, comments, boardTitle, outdated, disabled, command }: {
  item: Entity<Feedback>; comments: Entity<Comment>[]; boardTitle: string; outdated: boolean; disabled: boolean;
  command: (input: Record<string, unknown>) => Promise<boolean>;
}) {
  const [reply, setReply] = useState("");
  return <article className={styles.thread}>
    <header className={styles.header}><strong>{boardTitle}</strong><Button variant="ghost" size="sm" disabled={disabled} onClick={() => command({ type: "feedback.resolve", id: item.id, revision: item.revision, resolved: !item.value.resolved })}>{item.value.resolved ? "Reopen" : "Resolve"}</Button></header>
    {outdated && <span className={styles.muted}>Source changed since this feedback</span>}
    {item.value.selectedText && <blockquote>{item.value.selectedText}</blockquote>}
    {item.value.selector && <code className={styles.context}>{item.value.selector}</code>}
    <p>{item.value.body}</p><small>{item.value.author} · {new Date(item.value.createdAt).toLocaleString()}</small>
    {comments.map((comment) => <div className={styles.reply} key={comment.id}><p>{comment.value.body}</p><small>{comment.actor} · {new Date(comment.updatedAt).toLocaleString()}</small></div>)}
    <form className={styles.form} onSubmit={async (event) => { event.preventDefault(); if (await command({ type: "feedback.reply", id: item.id, body: reply })) setReply(""); }}>
      <Textarea aria-label={`Reply to feedback on ${boardTitle}`} placeholder="Reply…" value={reply} maxLength={10000} onChange={(event) => setReply(event.target.value)} disabled={disabled} />
      <Button size="sm" variant="outline" disabled={disabled || !reply.trim()}>Reply</Button>
    </form>
  </article>;
}
