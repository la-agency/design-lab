import { mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { DatabaseSync } from "node:sqlite";
import { expect, it } from "vitest";

it("backs up a live WAL database and restores data and retry receipts", () => {
  const root = mkdtempSync(join(tmpdir(), "studio-backup-"));
  mkdirSync(join(root, ".studio"));
  const db = new DatabaseSync(join(root, ".studio/workspace.sqlite"));
  try {
    db.exec("PRAGMA journal_mode=WAL; CREATE TABLE records (id TEXT PRIMARY KEY,value TEXT); CREATE TABLE requests (id TEXT PRIMARY KEY,response TEXT); INSERT INTO records VALUES ('a','saved'); INSERT INTO requests VALUES ('retry-1','receipt');");
    const target = join(root, "backup.sqlite");
    const cli = new URL("./design-lab.mjs", import.meta.url).pathname;
    const result = spawnSync(process.execPath, [cli, "data", "backup", target], { cwd: root, encoding: "utf8" });
    expect(result.status, result.stderr).toBe(0);
    const restored = new DatabaseSync(target, { readOnly: true });
    try {
      expect(restored.prepare("SELECT value FROM records WHERE id='a'").get().value).toBe("saved");
      expect(restored.prepare("SELECT response FROM requests WHERE id='retry-1'").get().response).toBe("receipt");
      expect(restored.prepare("PRAGMA integrity_check").get().integrity_check).toBe("ok");
    } finally { restored.close(); }
    expect(spawnSync(process.execPath, [cli, "data", "backup", target], { cwd: root }).status).toBe(1);
  } finally { db.close(); rmSync(root, { recursive: true }); }
});
