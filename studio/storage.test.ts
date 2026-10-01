import { mkdtemp, readFile, rm, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createDecisionHandlers } from "./decision-store";
import { createLayoutHandlers } from "./layout-store";
import { createWorkspaceHandlers } from "./data/workspace-store";
import { WorkspaceDatabase } from "./data/database";
import { isLocalStudioWrite } from "./local-write";
import type { CanvasLayout } from "./layout-state";
const directories: string[] = [];
afterEach(async () => { vi.unstubAllEnvs(); await Promise.all(directories.splice(0).map((path) => rm(path, { recursive: true, force: true }))); });
const files = [{ id: "welcome", title: "Welcome", href: "/files/welcome", pages: [{ id: "concepts", title: "Concepts", boards: ["a", "b"].map((id) => ({ id, title: id, description: "", width: 640, height: 900, preview: `/previews/${id}?revision=123`, sourcePath: `designs/welcome/versions/${id}.tsx` })) }] }];
async function setup() {
  vi.stubEnv("NODE_ENV", "development");
  const root = await mkdtemp(join(tmpdir(), "design-store-")); directories.push(root);
  return { root, decisions: createDecisionHandlers({ files, root }), layouts: createLayoutHandlers({ files, root }), workspace: createWorkspaceHandlers({ files, root }) };
}
function request(path: string, data: unknown, method = "PUT", requestId = randomUUID(), actor = "test") {
  return new Request(`http://127.0.0.1:4204${path}`, { method, headers: { origin: "http://127.0.0.1:4204", "Content-Type": "application/json", "X-Request-Id": requestId, "X-Studio-Actor": actor }, body: JSON.stringify(data) });
}
const favorite = { fileId: "welcome", pageId: "concepts", boardId: "a", title: "V1", source: "/files/welcome/exploration", favorite: true, revision: 0 };
const layout: CanvasLayout = { colour: null, sizes: {}, groups: [{ name: "Concepts", boardIds: ["a", "b"] }], offsets: {} };
const layoutPath = "/api/layouts?fileId=welcome&pageId=concepts";
function get(path: string) { return new Request(`http://127.0.0.1:4204${path}`); }

describe("transactional workspace storage", () => {
  it("imports legacy JSON once without modifying it, preserving rationale and layouts", async () => {
    const { root, decisions, layouts } = await setup();
    await mkdir(join(root, ".studio"));
    const legacy = [{ ...favorite, updatedAt: "2026-01-01", reason: "Chosen by user", useFor: "Header", assembledIn: null }];
    await writeFile(join(root, ".studio/decisions.json"), JSON.stringify(legacy));
    await writeFile(join(root, ".studio/layouts.json"), JSON.stringify({ "welcome/concepts": layout }));
    const before = await readFile(join(root, ".studio/decisions.json"), "utf8");
    const loaded = await (await decisions.GET(get("/api/design-decisions"))).json();
    expect(loaded[0]).toMatchObject({ reason: "Chosen by user", revision: 1 });
    expect(await (await layouts.GET(get(layoutPath))).json()).toEqual({ revision: 1, layout });
    expect((await decisions.PUT(request("/api/design-decisions", { ...favorite, revision: 1, favorite: false }))).status).toBe(200);
    expect(await readFile(join(root, ".studio/decisions.json"), "utf8")).toBe(before);
    const reopened = createDecisionHandlers({ files, root });
    expect((await (await reopened.GET(get("/api/design-decisions"))).json())[0].favorite).toBe(false);
  });
  it("rejects invalid migration atomically and can retry after correction", async () => {
    const { root } = await setup(); await mkdir(join(root, ".studio"));
    await writeFile(join(root, ".studio/layouts.json"), '{"broken":true}');
    expect(() => new WorkspaceDatabase(root)).toThrow(/Legacy state/);
    await writeFile(join(root, ".studio/layouts.json"), '{}');
    const db = new WorkspaceDatabase(root); expect(db.list()).toEqual([]); db.close();
  });
  it("rejects a stale same-favorite change across handler instances and isolates profiles", async () => {
    const { root, decisions } = await setup();
    const other = createDecisionHandlers({ files, root });
    expect((await decisions.PUT(request("/api/design-decisions", favorite))).status).toBe(200);
    expect((await other.PUT(request("/api/design-decisions", { ...favorite, favorite: false }))).status).toBe(409);
    const req = request("/api/design-decisions", favorite); req.headers.set("X-Studio-Profile", "teammate");
    expect((await other.PUT(req)).status).toBe(200);
    expect((await (await decisions.GET(get("/api/design-decisions"))).json()).length).toBe(1);
  });
  it("retries a command exactly once and rejects reuse with different content", async () => {
    const { decisions, root } = await setup(); const id = randomUUID();
    const first = await (await decisions.PUT(request("/api/design-decisions", favorite, "PUT", id))).json();
    const again = await (await decisions.PUT(request("/api/design-decisions", favorite, "PUT", id))).json();
    expect(again).toEqual(first);
    expect((await decisions.PUT(request("/api/design-decisions", { ...favorite, favorite: false }, "PUT", id))).status).toBe(409);
    const db = new WorkspaceDatabase(root); expect(db.history()).toHaveLength(1); db.close();
  });
  it("merges different boards but rejects competing moves without partial writes", async () => {
    const { layouts, root } = await setup();
    const seed = await (await layouts.PUT(request(layoutPath, { revision: 0, base: layout, layout }))).json();
    const first = { ...layout, offsets: { a: { x: 100, y: 0 } } };
    const second = { ...layout, offsets: { b: { x: 200, y: 0 } } };
    expect((await layouts.PUT(request(layoutPath, { revision: seed.revision, base: layout, layout: first }))).status).toBe(200);
    const other = createLayoutHandlers({ files, root });
    const merged = await (await other.PUT(request(layoutPath, { revision: seed.revision, base: layout, layout: second }))).json();
    expect(merged.layout.offsets).toEqual({ ...first.offsets, ...second.offsets });
    const conflict = await other.PUT(request(layoutPath, { revision: seed.revision, base: layout, layout: { ...layout, colour: "#ffffff", offsets: { a: { x: 500, y: 0 } } } }));
    expect(conflict.status).toBe(409);
    expect((await (await layouts.GET(get(layoutPath))).json()).layout.colour).toBe(null);
  });
  it("keeps independent feedback, records actors and rejects stale resolution", async () => {
    const { workspace, root } = await setup();
    const id = randomUUID();
    const a = await (await workspace.POST(request("/api/workspace", { type: "feedback.add", fileId: "welcome", boardId: "a", body: "Make it clearer", selector: "h1", selectedText: "Hello" }, "POST", id, "alex"))).json();
    expect(a.value).toMatchObject({ sourceRevision: "/previews/a?revision=123", selector: "h1" });
    const other = createWorkspaceHandlers({ files, root });
    for (const actor of ["alex", "sam"]) expect((await other.POST(request("/api/workspace", { type: "feedback.reply", id, body: actor }, "POST", randomUUID(), actor))).status).toBe(200);
    expect((await workspace.POST(request("/api/workspace", { type: "feedback.resolve", id, revision: 1, resolved: true }, "POST"))).status).toBe(200);
    expect((await other.POST(request("/api/workspace", { type: "feedback.resolve", id, revision: 1, resolved: false }, "POST"))).status).toBe(409);
    const state = await (await workspace.GET(get("/api/workspace"))).json();
    expect(state.records.filter((item: { kind: string }) => item.kind === "comment")).toHaveLength(2);
    expect(state.history.some((item: { actor: string }) => item.actor === "sam")).toBe(true);
  });
  it("preserves independent memberships and guards ordering and renames", async () => {
    const { workspace } = await setup();
    const item = await (await workspace.POST(request("/api/workspace", { type: "collection.create", fileId: "welcome", name: "Shortlist" }, "POST"))).json();
    for (const boardId of ["a", "b", "a"]) expect((await workspace.POST(request("/api/workspace", { type: "collection.member", id: item.id, boardId, present: true }, "POST"))).status).toBe(200);
    const state = await (await workspace.GET(get("/api/workspace"))).json();
    const current = state.records[0]; expect(current.value.boardIds).toEqual(["a", "b"]);
    expect((await workspace.POST(request("/api/workspace", { type: "collection.order", id: item.id, revision: 1, boardIds: ["b", "a"] }, "POST"))).status).toBe(409);
    expect((await workspace.POST(request("/api/workspace", { type: "collection.rename", id: item.id, revision: current.revision, name: "Approved candidates" }, "POST"))).status).toBe(200);
  });
  it("rejects foreign origins, missing revision/request IDs and production writes", async () => {
    const { decisions, workspace } = await setup();
    const foreign = request("/api/design-decisions", favorite); foreign.headers.set("origin", "https://evil.example");
    expect((await decisions.PUT(foreign)).status).toBe(403);
    const missing = request("/api/design-decisions", favorite); missing.headers.delete("X-Request-Id");
    expect((await decisions.PUT(missing)).status).toBe(428);
    expect((await decisions.PUT(request("/api/design-decisions", { ...favorite, revision: undefined }))).status).toBe(428);
    vi.stubEnv("NODE_ENV", "production");
    expect((await workspace.POST(request("/api/workspace", {}, "POST"))).status).toBe(403);
    expect((await (await workspace.GET(get("/api/workspace"))).json()).writable).toBe(false);
  });
});
it("accepts Next-normalized loopback URLs without accepting foreign hosts", () => {
  vi.stubEnv("NODE_ENV", "development");
  expect(isLocalStudioWrite(new Request("http://localhost:4203/api/layouts", { headers: { host: "127.0.0.1:4203", origin: "http://127.0.0.1:4203" } }))).toBe(true);
  expect(isLocalStudioWrite(new Request("http://localhost:4203/api/layouts", { headers: { host: "evil.example:4203", origin: "http://evil.example:4203" } }))).toBe(false);
});
