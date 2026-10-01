import type { StudioFile } from "./types";
import { isCanvasLayout } from "./layout-state";
import type { CanvasLayout } from "./layout-state";
import { isLocalStudioWrite } from "./local-write";
import { withDatabase, DataError } from "./data/database";
import { body, dataResponse, failure, identity, requireRequestId, revision } from "./data/http";
import { mergeLayout } from "./data/layout-merge";

export function createLayoutHandlers({ files, root = process.cwd() }: { files: readonly StudioFile[]; root?: string }) {
  function key(request: Request) {
    const params = new URL(request.url).searchParams;
    const file = params.get("fileId"), page = params.get("pageId");
    if (!files.some((item) => item.id === file) || !page || !/^[a-z0-9][a-z0-9-]{0,119}$/u.test(page)) throw new DataError("Invalid file or page.");
    return `${identity(request).profile}/${file}/${page}`;
  }
  async function GET(request: Request) {
    try {
      const id = key(request);
      return dataResponse(withDatabase(root, (db) => { const row = db.get<CanvasLayout>("layout", id); return { revision: row?.revision ?? 0, layout: row?.value ?? null }; }));
    } catch (error) { return failure(error); }
  }
  async function PUT(request: Request) {
    if (!isLocalStudioWrite(request)) return Response.json({ error: "Layouts can only be saved in the local Studio." }, { status: 403 });
    try {
      const id = key(request), input = await body(request);
      const expected = revision(input.revision);
      if (!isCanvasLayout(input.base) || !isCanvasLayout(input.layout)) throw new DataError("Invalid layout.");
      const base = input.base, proposed = input.layout;
      const { actor, requestId } = requireRequestId(request);
      return dataResponse(withDatabase(root, (db) => db.mutate(requestId, actor, { id, input }, () => {
        const current = db.get<CanvasLayout>("layout", id);
        const historical = db.atRevision<CanvasLayout>("layout", id, expected);
        const layout = mergeLayout(base, proposed, historical, current?.value ?? null);
        const result = db.put("layout", id, layout, actor, requestId);
        return { revision: result.revision, layout };
      })));
    } catch (error) { return failure(error); }
  }
  return { GET, PUT };
}
