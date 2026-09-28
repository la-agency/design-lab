# Design Lab — agent working contract

## Start here

Read README.md, docs/workspace.md, and the relevant design's brief before editing. For email work also read docs/emails.md. For setup in another project or framework changes read docs/integration.md. For sharing reusable improvements read CONTRIBUTING.md. This is a standalone local studio; do not search for or require the Saasco project.

When given only this repository link, help the user end to end:

1. Use upstream `https://github.com/la-agency/design-lab`; it is public. Confirm access separately for any private workspace. Clone into a new directory, or use the user's existing checkout. Do not overwrite an unrelated folder. A teammate starting their own work should use a template-created repository; evaluation can use an ordinary clone.
2. Verify Node 22 (22.14+) and pnpm 10. Follow README setup. Install with `pnpm install --frozen-lockfile`; do not replace pnpm or regenerate the lockfile merely to work around a mismatch.
3. Start `pnpm dev`, keep the process running, and open its actual local URL in the user's browser. Use a different loopback port when occupied. Check terminal output and an HTTP response before reporting it ready.
4. Ask for the intended design, brand, and output if missing. Independently inspect the sample project and `brand/guidelines.md`. Do not invent their real company facts or publish/send anything.
5. Create designs as described below. Preview, check, and iterate. Deliver the local URL, files changed, validation results, and usable exports. Explain any remaining blocker precisely.

When adding Design Lab to another project, default to a separate local app alongside the production app and follow docs/integration.md. Preserve the host's routes, dependencies, credentials, and agent instructions. The GitHub owner changed; the package name and imports remain `@la-agent/design-lab`.

When a workspace needs a reusable framework fix, keep it separate from workspace content and follow CONTRIBUTING.md to prepare it against current upstream. A template copy has unrelated Git history; do not push its entire branch upstream or merge unrelated histories. Offer the contribution with its validation results; only publish workspace-derived code when authorized. Do not merge an upstream PR just because its checks pass.

## Ownership and folder rules

- `designs/<slug>/design.json`: display title, kind, optional width/pages/result. Use lowercase letters, digits, hyphens for slugs and version names.
- `designs/<slug>/versions/<version>.tsx`: default-export one React component that works without required props. Use sample data or a wrapper around a reusable component. Web versions can use hooks with `"use client"`; emails must render on the server without hooks or browser APIs.
- `designs/<slug>/brief.md`: audience, intent, facts, outstanding decisions. Keep explanation outside the rendered design.
- `brand/` and `public/`: workspace-owned guidance and browser assets. Public files are visible to browsers; never store secrets there.
- `.studio/decisions.json` and `.studio/layouts.json`: durable workspace state. Read selections before refining; preserve unrelated records.
- `studio/` and `bin/`: framework. Ordinary design requests should not require changes here.
- `app/`: host adapters. Never manually register discovered versions here.
- `.studio/catalog.ts`, `.studio/generated-routes.json`, `app/previews/generated/`, `app/api/exports/`: generated. Do not edit by hand or commit. Run `pnpm sync` to regenerate. The generator deletes only routes that it previously created and marked.

## Create and refine

1. Read brand guidance, the brief, existing versions, and saved decisions.
2. Write complete components/dependencies first; add the manifest or page registration last. Preserve earlier versions when exploring. Avoid importing nonexistent files even temporarily.
3. With no explicit pages, all version files appear automatically. With explicit pages, every version must appear exactly once. Run `pnpm sync` after structural changes.
4. Use stable IDs. Stars identify candidates; they are not approval of a whole design. Record the user's rationale accurately without inventing it. Don't mark a result approved unless the user explicitly approves it.
5. To assemble a result, create a new version and set `result` to its filename stem. Default to `resultStatus: "wip"`; record its source versions and choices in the brief. Explicit approval allows `resultStatus: "approved"`. Preserve explorations.
6. Put only the proposed email/page/product UI in previews. Review notes, version labels, export controls, and assembly explanations belong in studio chrome or Markdown.
7. Use the shared canvas/history/preview APIs instead of building another canvas. Canvas groups align horizontally by default. Dragging a board must not rearrange its neighbors.

## Verification

Run `pnpm check`, `pnpm test`, and `pnpm smoke` after implementation. The smoke check starts and stops its own server on port 4298; it reads previews/exports without modifying saved state. Do one full browser pass after the work is complete; if it finds a bug, fix it and recheck that path. For a new design verify file discovery, every affected version, desktop/mobile width, fullscreen, theme controls, and absence of terminal/browser errors. For framework changes also verify favorites survive reload, layout saving, undo/redo, tabs, and a fresh checkout install. For emails verify downloaded HTML matches preview HTML, plain text is readable, and no localhost asset URLs remain in a deliverable.

A browser preview is not proof of Gmail/Outlook/Apple Mail rendering. State which clients were actually tested. Do not send email, deploy, publish, invite users, or add paid integrations unless the user authorizes that action.

## Storage and runtime limits

Local same-origin development writes only. A hosted production build is read-only. JSON writes are serialized and replaced atomically within one server process; run one writable server per workspace. Git owns durable history. Undo and interactive component state are session-local. Do not share a data folder between processes, claim multi-user conflict handling, or disable origin/host checks to make a deployment editable.

Source code is trusted local code executed by the user's development server. Preview iframes isolate styles, not hostile code. Do not offer arbitrary remote code execution or claim sandboxing. Generated email previews prohibit scripts.

## Code

Use pnpm, TypeScript strict mode, named functions and `import type`. No `as any`, secrets, or unrelated dependency changes. Use relative imports within framework modules, explicit package subpaths from a host. Keep preview component imports out of the shared catalog/shell: one static route per version prevents every preview from joining the same module graph. Runtime boundaries do not isolate syntax/compiler failures.

Next.js documentation ships at `node_modules/next/dist/docs/`; consult the relevant guide before changing framework routing or server/client boundaries. This starter uses Next 16.3; use its installed types rather than assumptions from older Next versions.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
