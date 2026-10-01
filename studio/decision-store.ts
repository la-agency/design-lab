import type { StudioFile } from "./types";
import { isFavoriteInput } from "./design-decisions";
import type { DesignDecision } from "./design-decisions";
import { isLocalStudioWrite } from "./local-write";
import { withDatabase, DataError } from "./data/database";
import { body, dataResponse, failure, identity, requireRequestId, revision } from "./data/http";

export function createDecisionHandlers({ files, root = process.cwd() }: { files: readonly StudioFile[]; root?: string }) {
  function list(db: Parameters<Parameters<typeof withDatabase>[1]>[0], profile: string) {
    return db.list<DesignDecision>("favorite").filter((item) => item.id.startsWith(`${profile}/`)).map((item) => ({ ...item.value, revision: item.revision }));
  }
  async function GET(request: Request) {
    try { const { profile } = identity(request); return dataResponse(withDatabase(root, (db) => list(db, profile))); }
    catch (error) { return failure(error); }
  }
  async function PUT(request: Request) {
    if (!isLocalStudioWrite(request)) return Response.json({ error: "Favorites can only be saved in the local Studio." }, { status: 403 });
    try {
      const input = await body(request, 8000);
      const expected = revision(input.revision);
      if (!isFavoriteInput(input) || !files.some((file) => file.id === input.fileId)) throw new DataError("Invalid favorite.");
      const { actor, profile, requestId } = requireRequestId(request);
      return dataResponse(withDatabase(root, (db) => db.mutate(requestId, actor, { profile, input }, () => {
        const id = `${profile}/${input.fileId}/${input.pageId}/${input.boardId}`;
        const previous = db.get<DesignDecision>("favorite", id);
        const value: DesignDecision = {
          fileId: input.fileId, pageId: input.pageId, boardId: input.boardId, title: input.title,
          source: input.source, favorite: input.favorite, updatedAt: new Date().toISOString(),
          reason: previous?.value.reason ?? "Favorited in Studio; rationale not yet recorded.",
          useFor: previous?.value.useFor ?? "", assembledIn: previous?.value.assembledIn ?? null,
        };
        db.put("favorite", id, value, actor, requestId, expected);
        return list(db, profile);
      })));
    } catch (error) { return failure(error); }
  }
  return { GET, PUT };
}
