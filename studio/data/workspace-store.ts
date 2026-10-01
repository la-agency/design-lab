import type { StudioFile } from "../types";
import { isLocalStudioWrite } from "../local-write";
import { DataError, withDatabase } from "./database";
import type { Entity, WorkspaceDatabase } from "./database";
import { body, dataResponse, failure, identity, requireRequestId, revision } from "./http";
import type { Collection, Comment, Feedback } from "./model";

function text(value: unknown, label: string, limit = 10000, allowEmpty = false): string {
  if (typeof value !== "string" || (!allowEmpty && !value.trim()) || value.length > limit) throw new DataError(`Invalid ${label}.`);
  return value;
}
function required<T>(db: WorkspaceDatabase, kind: string, id: string): Entity<T> {
  const item = db.get<T>(kind, id);
  if (!item) throw new DataError("Item not found.", 404);
  return item;
}
export function createWorkspaceHandlers({ files, root = process.cwd() }: { files: readonly StudioFile[]; root?: string }) {
  function file(id: unknown) {
    const item = files.find((entry) => entry.id === id);
    if (!item) throw new DataError("Design not found.", 404);
    return item;
  }
  function board(fileId: unknown, boardId: unknown) {
    const design = file(fileId);
    const item = design.pages?.flatMap((page) => page.boards).find((entry) => entry.id === boardId);
    if (!item) throw new DataError("Board not found.", 404);
    return item;
  }
  async function GET(request: Request) {
    try {
      const params = new URL(request.url).searchParams;
      const { profile } = identity(request);
      return withDatabase(root, (db) => {
        if (params.get("export") === "json") return new Response(JSON.stringify(db.snapshot(), null, 2), { headers: { "Content-Type": "application/json", "Content-Disposition": 'attachment; filename="design-lab-data.json"', "Cache-Control": "no-store" } });
        const after = Number(params.get("after") ?? 0);
        if (!Number.isSafeInteger(after) || after < 0) throw new DataError("Invalid history cursor.");
        const fileId = params.get("fileId");
        const records = db.list().filter((item) => {
          if (["favorite", "layout"].includes(item.kind)) return item.id.startsWith(`${profile}/`) && (!fileId || item.id.startsWith(`${profile}/${fileId}/`));
          if (!fileId) return true;
          if (item.kind === "comment") {
            const comment = item.value as Comment;
            return db.get<Feedback>("feedback", comment.threadId)?.value.fileId === fileId;
          }
          return (item.value as { fileId?: string }).fileId === fileId;
        });
        return dataResponse({ records, history: db.history(after), writable: process.env.NODE_ENV === "development", profile });
      });
    } catch (error) { return failure(error); }
  }
  async function POST(request: Request) {
    if (!isLocalStudioWrite(request)) return Response.json({ error: "Workspace data can only be edited in the local Studio." }, { status: 403 });
    try {
      const input = await body(request, 40000);
      const { actor, requestId } = requireRequestId(request);
      return dataResponse(withDatabase(root, (db) => db.mutate(requestId, actor, input, () => {
        switch (input.type) {
          case "feedback.add": {
            const target = board(input.fileId, input.boardId);
            const value: Feedback = {
              fileId: String(input.fileId), boardId: target.id, body: text(input.body, "feedback"), resolved: false, author: actor, createdAt: new Date().toISOString(),
              sourcePath: target.sourcePath ?? "", sourceRevision: text(input.sourceRevision ?? target.preview ?? "", "source revision", 2000, true),
              selector: text(input.selector ?? "", "selector", 2000, true),
              selectedText: text(input.selectedText ?? "", "selected text", 4000, true),
            };
            return db.put("feedback", requestId, value, actor, requestId, 0);
          }
          case "feedback.reply": {
            const id = text(input.id, "thread ID", 100);
            required<Feedback>(db, "feedback", id);
            return db.put("comment", requestId, { threadId: id, body: text(input.body, "comment") }, actor, requestId, 0);
          }
          case "feedback.resolve": {
            const id = text(input.id, "thread ID", 100), item = required<Feedback>(db, "feedback", id);
            if (typeof input.resolved !== "boolean") throw new DataError("Invalid feedback status.");
            return db.put("feedback", id, { ...item.value, resolved: input.resolved }, actor, requestId, revision(input.revision));
          }
          case "collection.create": {
            const design = file(input.fileId);
            return db.put("collection", requestId, { fileId: design.id, name: text(input.name, "collection name", 120), boardIds: [], archived: false } satisfies Collection, actor, requestId, 0);
          }
          case "collection.rename":
          case "collection.archive":
          case "collection.member":
          case "collection.order": {
            const id = text(input.id, "collection ID", 100), item = required<Collection>(db, "collection", id);
            const value = structuredClone(item.value);
            let expected: number | undefined;
            if (input.type === "collection.member") {
              const target = input.present === false ? { id: text(input.boardId, "board ID", 120) } : board(value.fileId, input.boardId);
              if (typeof input.present !== "boolean") throw new DataError("Invalid membership.");
              value.boardIds = value.boardIds.filter((entry) => entry !== target.id);
              if (input.present) {
                // Existing membership keeps its position on an idempotent add.
                value.boardIds = item.value.boardIds.includes(target.id) ? item.value.boardIds : [...value.boardIds, target.id];
              }
            } else {
              expected = revision(input.revision);
              if (input.type === "collection.rename") value.name = text(input.name, "collection name", 120);
              if (input.type === "collection.archive") {
                if (typeof input.archived !== "boolean") throw new DataError("Invalid archive status.");
                value.archived = input.archived;
              }
              if (input.type === "collection.order") {
                if (!Array.isArray(input.boardIds) || input.boardIds.length !== value.boardIds.length || new Set(input.boardIds).size !== value.boardIds.length || !input.boardIds.every((entry) => typeof entry === "string" && value.boardIds.includes(entry))) throw new DataError("Ordering must contain each existing member once.");
                value.boardIds = input.boardIds;
              }
            }
            return db.put("collection", id, value, actor, requestId, expected);
          }
          default: throw new DataError("Unknown workspace command.");
        }
      })));
    } catch (error) { return failure(error); }
  }
  return { GET, POST };
}
