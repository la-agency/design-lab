"use client";
import { useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import type { BoardDefinition } from "../types";
import type { Entity } from "./database";
import type { Collection } from "./model";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import styles from "./review.module.css";

export function CollectionItem({ item, boards, command, disabled }: {
  item: Entity<Collection>; boards: BoardDefinition[]; command: (input: Record<string, unknown>) => Promise<boolean>; disabled: boolean;
}) {
  const [draft, setDraft] = useState<{ name: string; revision: number } | null>(null);
  function move(index: number, delta: number) {
    const ids = [...item.value.boardIds];
    [ids[index], ids[index + delta]] = [ids[index + delta], ids[index]];
    void command({ type: "collection.order", id: item.id, revision: item.revision, boardIds: ids });
  }
  return <section className={styles.thread}>
    <header className={styles.header}><strong>{item.value.name}{item.value.archived ? " · Archived" : ""}</strong>
      <Button size="sm" variant="ghost" disabled={disabled} onClick={() => command({ type: "collection.archive", id: item.id, revision: item.revision, archived: !item.value.archived })}>{item.value.archived ? "Restore" : "Archive"}</Button>
    </header>
    {!item.value.archived && <>
      {draft ? <form className={styles.actions} onSubmit={async (event) => { event.preventDefault(); if (await command({ type: "collection.rename", id: item.id, ...draft })) setDraft(null); }}>
        <Input aria-label="Rename collection" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} maxLength={120} />
        <Button size="sm" disabled={disabled || !draft.name.trim()}>Save</Button><Button size="sm" variant="ghost" type="button" onClick={() => setDraft(null)}>Cancel</Button>
      </form> : <Button size="sm" variant="ghost" disabled={disabled} onClick={() => setDraft({ name: item.value.name, revision: item.revision })}>Rename</Button>}
      {item.value.boardIds.map((id, index) => <div key={id} className={styles.header}>
        <Button variant="link" size="sm" onClick={() => window.dispatchEvent(new CustomEvent("design-canvas-focus", { detail: id }))}>{boards.find((board) => board.id === id)?.title ?? `${id} (unavailable)`}</Button>
        <div className={styles.actions}>
          <Button size="icon-sm" variant="ghost" aria-label={`Move ${id} earlier`} disabled={disabled || index === 0} onClick={() => move(index, -1)}><ArrowUp size={14} /></Button>
          <Button size="icon-sm" variant="ghost" aria-label={`Move ${id} later`} disabled={disabled || index === item.value.boardIds.length - 1} onClick={() => move(index, 1)}><ArrowDown size={14} /></Button>
          <Button size="sm" variant="ghost" disabled={disabled} onClick={() => command({ type: "collection.member", id: item.id, boardId: id, present: false })}>Remove</Button>
        </div>
      </div>)}
      <div className={styles.actions}>{boards.filter((board) => !item.value.boardIds.includes(board.id)).map((board) => <Button size="sm" variant="outline" key={board.id} disabled={disabled} onClick={() => command({ type: "collection.member", id: item.id, boardId: board.id, present: true })}>Add {board.title}</Button>)}</div>
    </>}
  </section>;
}
