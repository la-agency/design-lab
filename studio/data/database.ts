import { DatabaseSync } from "node:sqlite";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { isDesignDecisions } from "../design-decisions";
import { isLayoutStore } from "../layout-state";

export type Entity<T = unknown> = {
  kind: string;
  id: string;
  revision: number;
  value: T;
  actor: string;
  updatedAt: string;
};
type Row = { kind: string; id: string; revision: number; value: string; actor: string; updated_at: string };
export class DataError extends Error {
  constructor(message: string, public status = 400, public current?: unknown) { super(message); }
}
function decode<T>(row: Row): Entity<T> {
  return { kind: row.kind, id: row.id, revision: row.revision, value: JSON.parse(row.value) as T, actor: row.actor, updatedAt: row.updated_at };
}
export function fingerprint(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

/** All mutations, audit events and retry receipts share the same transaction. */
export class WorkspaceDatabase {
  private db: DatabaseSync;
  constructor(public root: string, readonly = false) {
    const directory = join(root, ".studio");
    const path = join(directory, "workspace.sqlite");
    const onDisk = existsSync(path);
    if (!readonly) mkdirSync(directory, { recursive: true });
    this.db = new DatabaseSync(readonly && !onDisk ? ":memory:" : path, { readOnly: readonly && onDisk });
    this.db.exec("PRAGMA busy_timeout=5000; PRAGMA foreign_keys=ON;");
    if (readonly && onDisk) {
      this.checkVersion();
      return;
    }
    if (!readonly) this.db.exec("PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL;");
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const version = this.schemaVersion();
      if (version > 1) throw new DataError("Workspace database is newer than this version of Design Lab.", 500);
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS records (
          kind TEXT NOT NULL, id TEXT NOT NULL, revision INTEGER NOT NULL,
          value TEXT NOT NULL, actor TEXT NOT NULL, updated_at TEXT NOT NULL,
          PRIMARY KEY(kind,id));
        CREATE TABLE IF NOT EXISTS events (
          sequence INTEGER PRIMARY KEY AUTOINCREMENT, request_id TEXT NOT NULL,
          kind TEXT NOT NULL, id TEXT NOT NULL, revision INTEGER NOT NULL,
          actor TEXT NOT NULL, at TEXT NOT NULL, before_value TEXT, after_value TEXT NOT NULL);
        CREATE INDEX IF NOT EXISTS events_entity ON events(kind,id,revision);
        CREATE TABLE IF NOT EXISTS requests (id TEXT PRIMARY KEY, fingerprint TEXT NOT NULL, response TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL);
        PRAGMA user_version=1;
      `);
      if (!this.db.prepare("SELECT key FROM metadata WHERE key='imported'").get()) {
        this.importLegacy();
        this.db.prepare("INSERT INTO metadata VALUES ('imported',?)").run(new Date().toISOString());
      }
      this.db.exec("COMMIT");
    } catch (error) { this.db.exec("ROLLBACK"); this.db.close(); throw error; }
  }
  private schemaVersion() { return Number(this.db.prepare("PRAGMA user_version").get()?.user_version); }
  private checkVersion() {
    if (this.schemaVersion() !== 1) { this.db.close(); throw new DataError("Unsupported workspace database version.", 500); }
  }
  close() { this.db.close(); }
  get<T>(kind: string, id: string): Entity<T> | null {
    const row = this.db.prepare("SELECT * FROM records WHERE kind=? AND id=?").get(kind, id) as Row | undefined;
    return row ? decode<T>(row) : null;
  }
  list<T>(kind?: string): Entity<T>[] {
    const rows = (kind ? this.db.prepare("SELECT * FROM records WHERE kind=? ORDER BY updated_at,id").all(kind) : this.db.prepare("SELECT * FROM records ORDER BY kind,id").all()) as Row[];
    return rows.map(decode<T>);
  }
  history(after = 0) {
    return this.db.prepare("SELECT sequence,request_id AS requestId,kind,id,revision,actor,at,before_value AS beforeValue,after_value AS afterValue FROM events WHERE sequence>? ORDER BY sequence LIMIT 200").all(after);
  }
  atRevision<T>(kind: string, id: string, revision: number): T | null {
    if (revision === 0) return null;
    const row = this.db.prepare("SELECT after_value FROM events WHERE kind=? AND id=? AND revision=?").get(kind, id, revision);
    if (!row) throw new DataError("That revision is unavailable. Reload before saving.", 409, this.get(kind, id));
    return JSON.parse(String(row.after_value)) as T;
  }
  mutate<T>(requestId: string, actor: string, input: unknown, apply: () => T): T {
    const hash = fingerprint({ actor, input });
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const prior = this.db.prepare("SELECT fingerprint,response FROM requests WHERE id=?").get(requestId);
      if (prior) {
        if (prior.fingerprint !== hash) throw new DataError("Request ID was already used for a different change.", 409);
        this.db.exec("COMMIT");
        return JSON.parse(String(prior.response)) as T;
      }
      const response = apply();
      this.db.prepare("INSERT INTO requests VALUES (?,?,?)").run(requestId, hash, JSON.stringify(response));
      this.db.exec("COMMIT");
      return response;
    } catch (error) { this.db.exec("ROLLBACK"); throw error; }
  }
  put<T>(kind: string, id: string, value: T, actor: string, requestId: string, expected?: number): Entity<T> {
    const previous = this.get<T>(kind, id);
    if (expected !== undefined && (previous?.revision ?? 0) !== expected)
      throw new DataError("This item changed elsewhere. Review the latest version before saving.", 409, previous);
    const revision = (previous?.revision ?? 0) + 1;
    const at = new Date().toISOString();
    const json = JSON.stringify(value);
    this.db.prepare("INSERT INTO records VALUES (?,?,?,?,?,?) ON CONFLICT(kind,id) DO UPDATE SET revision=excluded.revision,value=excluded.value,actor=excluded.actor,updated_at=excluded.updated_at").run(kind, id, revision, json, actor, at);
    this.db.prepare("INSERT INTO events(request_id,kind,id,revision,actor,at,before_value,after_value) VALUES (?,?,?,?,?,?,?,?)").run(requestId, kind, id, revision, actor, at, previous ? JSON.stringify(previous.value) : null, json);
    return { kind, id, revision, value, actor, updatedAt: at };
  }
  snapshot() {
    this.db.exec("BEGIN");
    try {
      const result = { schemaVersion: 1, exportedAt: new Date().toISOString(), records: this.list(), events: this.db.prepare("SELECT * FROM events ORDER BY sequence").all() };
      this.db.exec("COMMIT");
      return result;
    } catch (error) { this.db.exec("ROLLBACK"); throw error; }
  }
  private importLegacy() {
    const decisionsPath = join(this.root, ".studio/decisions.json");
    const layoutsPath = join(this.root, ".studio/layouts.json");
    const decisions: unknown = existsSync(decisionsPath) ? JSON.parse(readFileSync(decisionsPath, "utf8")) : [];
    const layouts: unknown = existsSync(layoutsPath) ? JSON.parse(readFileSync(layoutsPath, "utf8")) : {};
    if (!isDesignDecisions(decisions) || !isLayoutStore(layouts)) throw new DataError("Legacy state is invalid. Fix the JSON before migration; no records were imported.", 500);
    for (const value of decisions) this.put("favorite", `local/${value.fileId}/${value.pageId}/${value.boardId}`, value, "migration", "migration");
    for (const [id, value] of Object.entries(layouts)) this.put("layout", `local/${id}`, value, "migration", "migration");
    // Preserve exact original inputs in the database as well as the untouched files.
    this.db.prepare("INSERT INTO metadata VALUES ('legacy-json',?)").run(JSON.stringify({ decisions, layouts }));
  }
}

export function withDatabase<T>(root: string, action: (db: WorkspaceDatabase) => T) {
  const db = new WorkspaceDatabase(root, process.env.NODE_ENV !== "development");
  try { return action(db); } finally { db.close(); }
}
