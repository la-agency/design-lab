import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

export async function dataCommand(args) {
  const command = args[0];
  function option(name, fallback) { const index = args.indexOf(name); return index < 0 ? fallback : args[index + 1]; }
  if (command === "backup") {
    const destination = args[1];
    const source = resolve(".studio/workspace.sqlite");
    if (!destination || destination.startsWith("--")) throw new Error("Use design-lab data backup <new-file.sqlite>.");
    if (!existsSync(source)) throw new Error("Start the studio once to initialize workspace storage.");
    if (existsSync(resolve(destination))) throw new Error("Backup destination already exists; choose a new filename.");
    const { DatabaseSync } = await import("node:sqlite");
    const db = new DatabaseSync(source, { readOnly: true });
    try { db.exec("PRAGMA busy_timeout=5000"); db.prepare("VACUUM INTO ?").run(resolve(destination)); }
    finally { db.close(); }
    console.log(`Backup saved to ${resolve(destination)}`);
    return;
  }
  const base = new URL(option("--url", "http://127.0.0.1:4204"));
  if (base.protocol !== "http:" || !["127.0.0.1", "localhost", "[::1]"].includes(base.hostname) || base.username || base.password) throw new Error("Use the local Studio's loopback HTTP URL.");
  const headers = { "Content-Type": "application/json", Origin: base.origin, "X-Studio-Actor": option("--actor", "agent"), "X-Studio-Profile": option("--profile", "local") };
  let path = "/api/workspace", method = "GET", body;
  if (command === "write") {
    const inputFile = args[1];
    if (!inputFile || inputFile.startsWith("--")) throw new Error("Use design-lab data write <command.json> --request-id <unique-id>.");
    const requestId = option("--request-id");
    if (!requestId) throw new Error("Supply --request-id and reuse it when retrying the same command.");
    headers["X-Request-Id"] = requestId;
    const input = JSON.parse(readFileSync(inputFile, "utf8"));
    method = "POST";
    if (input.type === "favorite.set") { path = "/api/design-decisions"; method = "PUT"; }
    if (input.type === "layout.save") { path = `/api/layouts?fileId=${encodeURIComponent(input.fileId)}&pageId=${encodeURIComponent(input.pageId)}`; method = "PUT"; }
    body = JSON.stringify(input);
  } else if (command === "export") path += "?export=json";
  else if (command === "get") {
    const file = option("--file");
    if (file) path += `?fileId=${encodeURIComponent(file)}`;
  } else throw new Error("Usage: design-lab data get | write <command.json> --request-id <id> | export [--output file.json] | backup <new-file.sqlite>");
  const response = await fetch(new URL(path, base.origin), { method, headers, body });
  const result = await response.text();
  if (!response.ok) throw new Error(`Studio returned ${response.status}: ${result}`);
  const output = option("--output");
  if (output) writeFileSync(output, result + "\n", { flag: "wx" });
  else console.log(JSON.stringify(JSON.parse(result), null, 2));
}
