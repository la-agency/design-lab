#!/usr/bin/env node
import { spawn } from "node:child_process";
import { watch, existsSync } from "node:fs";
import { createRequire } from "node:module";

import { dataCommand } from "./data.mjs";
import { syncWorkspace } from "./sync.mjs";
const command = process.argv[2] ?? "dev";
if (command === "data") {
  try { await dataCommand(process.argv.slice(3)); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
} else if (!["dev", "sync"].includes(command)) {
  console.error("Usage: design-lab dev [--port 4204] | design-lab sync | design-lab data");
  process.exit(1);
}
if (command !== "data") try {
  const files = syncWorkspace();
  console.log(`Design Lab: ${files.length} design files discovered.`);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
if (command === "dev") {
  const args = process.argv.slice(3);
  const index = args.indexOf("--port");
  const port = index < 0 ? "4204" : args[index + 1];
  if (!port || !/^\d+$/u.test(port) || +port < 1024 || +port > 65535)
    throw new Error("Use --port 1024–65535.");
  const require = createRequire(`${process.cwd()}/package.json`);
  const child = spawn(
    process.execPath,
    [
      require.resolve("next/dist/bin/next"),
      "dev",
      "--hostname",
      "127.0.0.1",
      "-p",
      port,
    ],
    { stdio: "inherit" }
  );
  let timer;
  const watcher = existsSync("designs")
    ? watch("designs", { recursive: true }, () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
          try {
            syncWorkspace();
          } catch (error) {
            console.error(`Design discovery: ${error.message}`);
          }
        }, 200);
      })
    : null;
  child.on("exit", (code) => {
    watcher?.close();
    clearTimeout(timer);
    process.exitCode = code ?? 1;
  });
  for (const signal of ["SIGINT", "SIGTERM"])
    process.on(signal, () => child.kill(signal));
}
