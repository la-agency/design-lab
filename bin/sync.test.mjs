import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
  rmSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";

import { describe, it, expect } from "vitest";

import { discover, syncWorkspace } from "./sync.mjs";
function fixture(fn) {
  const root = mkdtempSync(path.join(os.tmpdir(), "studio-test-"));
  try {
    const dir = path.join(root, "designs/welcome/versions");
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      path.join(dir, "v1.tsx"),
      "export default function Email() { return null; }"
    );
    writeFileSync(
      path.join(root, "designs/welcome/design.json"),
      JSON.stringify({ title: "Welcome", kind: "email" })
    );
    fn(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}
describe("workspace discovery", () => {
  it("discovers folders and generates isolated preview/export routes", () =>
    fixture((root) => {
      const files = syncWorkspace(root);
      expect(files[0].pages[0].boards[0].width).toBe(640);
      expect(files[0].pages[0].boards[0].sourcePath).toBe("designs/welcome/versions/v1.tsx");
      expect(files[0].final).toBeUndefined();
      const preview = readFileSync(
        path.join(root, "app/previews/generated/welcome/v1/route.ts"),
        "utf8"
      );
      expect(preview).toContain("render(createElement(Design))");
      expect(preview).not.toContain("v2");
      expect(
        existsSync(path.join(root, "app/api/exports/welcome/v1/route.ts"))
      ).toBe(true);
    }));
  it("rejects missing results and unsafe page references before writing", () =>
    fixture((root) => {
      writeFileSync(
        path.join(root, "designs/welcome/design.json"),
        JSON.stringify({ title: "Welcome", result: "../other" })
      );
      expect(() => syncWorkspace(root)).toThrow("result");
      expect(existsSync(path.join(root, ".studio/catalog.ts"))).toBe(false);
    }));
  it("refreshes preview revisions when shared content changes", () =>
    fixture((root) => {
      const before = discover(root)[0].pages[0].boards[0].preview;
      writeFileSync(
        path.join(root, "designs/welcome/copy.ts"),
        'export const text="changed"'
      );
      expect(discover(root)[0].pages[0].boards[0].preview).not.toBe(before);
    }));
  it("does not overwrite authored routes", () =>
    fixture((root) => {
      const dir = path.join(root, "app/previews/generated/welcome/v1");
      mkdirSync(dir, { recursive: true });
      writeFileSync(path.join(dir, "route.ts"), "authored");
      expect(() => syncWorkspace(root)).toThrow("overwrite");
      expect(readFileSync(path.join(dir, "route.ts"), "utf8")).toBe("authored");
    }));
  it("removes only obsolete generated routes", () =>
    fixture((root) => {
      syncWorkspace(root);
      writeFileSync(
        path.join(root, "designs/welcome/design.json"),
        JSON.stringify({ title: "Welcome", kind: "web" })
      );
      syncWorkspace(root);
      expect(
        existsSync(
          path.join(root, "app/previews/generated/welcome/v1/route.ts")
        )
      ).toBe(false);
      expect(readFileSync(path.join(root, "app/previews/generated/welcome/v1/page.tsx"), "utf8")).toContain('data-design-source="designs/welcome/versions/v1.tsx"');
      expect(
        existsSync(
          path.join(root, "app/previews/generated/welcome/v1/page.tsx")
        )
      ).toBe(true);
    }));
});
