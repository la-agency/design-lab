# Design Lab — agent working contract

## Start here

Read README.md, docs/workspace.md, and the relevant design's brief before editing. For email work also read docs/emails.md. For setup in another project or framework changes read docs/integration.md. For sharing reusable improvements read CONTRIBUTING.md. The studio runs as its own local app and can live inside an existing product repository; it does not require the Saasco project.

When given only this repository link, help the user end to end:

1. Use upstream `https://github.com/la-agency/design-lab`; it is public. Default to adding the studio inside the user's existing product repository as a separate app, following docs/integration.md and that repository's instructions. Confirm the target repository if none is known. Use a temporary upstream checkout as the source; do not add nested Git history or overwrite an unrelated folder. A template-created standalone repository is the alternative when there is no existing product; evaluation can use an ordinary clone.
2. Verify Node 22 (22.14+) and pnpm 10. Follow README setup. Use `pnpm install --frozen-lockfile` for an unchanged checkout. When adding the studio or shared dependencies to an existing pnpm workspace, update its root lockfile deliberately, review the changes, then verify a frozen install. Do not replace the host's package manager or regenerate a lockfile merely to work around a mismatch.
3. Start `pnpm dev`, keep the process running, and open its actual local URL in the user's browser. Use a different loopback port when occupied. Check terminal output and an HTTP response before reporting it ready.
4. Ask for the intended design, brand, and output if missing. Independently inspect the sample project and `brand/guidelines.md`. Do not invent their real company facts or publish/send anything.
5. Create designs as described below. Preview, check, and iterate. Deliver the local URL, files changed, validation results, and usable exports. Explain any remaining blocker precisely.

When adding Design Lab to another project, default to a pinned framework consumer in an app directory in the same repository, such as `apps/design-lab`, with shared UI imports from the host's existing packages. Use a copied framework snapshot only as an intentional fallback. Preserve the host's routes, dependencies, credentials, and agent instructions. Wire required preview styles/providers and sample data explicitly, then verify at least one real shared component renders and updates after a source edit. Record the upstream URL, installed full SHA, app path, shared packages, and validation commands in the product's documentation. Shared component edits affect the production app too; keep exploratory variants local until a shared change is intended. Do not automatically restructure the whole product to extract a UI package. The GitHub owner changed; the package name and imports remain `@la-agent/design-lab`.

When a workspace needs a reusable framework fix, follow CONTRIBUTING.md: create or reuse a separate upstream checkout and make the fix there from the start. Test a packed candidate in a disposable consumer checkout, then open the authorized upstream PR. Do not edit installed dependencies or ask the user to transfer patches manually. After merge, verify the merged SHA and update the consumer's pin and lockfile, removing temporary local dependency overrides. If review is pending, report that state and keep the consumer's existing pin. A template copy has unrelated Git history; recover existing fixes by porting only reusable changes, never by pushing the whole product branch or merging unrelated histories. Only publish workspace-derived code when authorized. Do not merge an upstream PR just because its checks pass.

## Ownership and folder rules

- `designs/<slug>/design.json`: display title, kind, optional width/pages/result. Use lowercase letters, digits, hyphens for slugs and version names.
- `designs/<slug>/versions/<version>.tsx`: default-export one React component that works without required props. Use sample data or a wrapper around a reusable component. Web versions can use hooks with `"use client"`; emails must render on the server without hooks or browser APIs.
- `designs/<slug>/brief.md`: audience, intent, facts, outstanding decisions. Keep explanation outside the rendered design.
- `brand/` and `public/`: workspace-owned guidance and browser assets. Public files are visible to browsers; never store secrets there.
- `.studio/workspace.sqlite`: current favorites, layouts, feedback, collections and audit history. Use `design-lab data` or the shared API for writes; read `docs/data-and-collaboration.md`. Original decisions/layout JSON imports once and must not be used as a second live store. Back up the ignored database, and preserve unrelated records.
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
8. Preserve native browser annotations on boards and the optional **Copy element context** / **Copy selection** workflow. Do not add a separate annotation view: native element context has been verified to reach the chat even when the highlight is offset. Treat context delivery and outline alignment as separate checks. Board annotation integration belongs in the shared preview API: map iframe coordinates through canvas scale/pan, keep source context, feature-detect browser APIs, and dispose registrations. Do not invent composer APIs or intercept annotation gestures for panning. Confirm the optional native API actually registered before claiming the custom surface bridge is active; keep the app-owned selector available when it does not. Verify selection bounds at multiple zooms; unit tests alone do not establish browser compatibility. See docs/workspace.md.

## Launch support

The former launch-specific JSON editor and preview framework have been rolled back. Do not restore `kind: "launch"` or `init-launch`. Future launch work should use this database layer for drafts/review, reusable definitions in Git, shared channel data and explicit revision-bound human approval. See `docs/data-and-collaboration.md`. Keep missing real media explicit and credentials out of records.

## Verification

Run `pnpm check`, `pnpm test`, and `pnpm smoke` after implementation. The smoke check starts and stops its own server on port 4298; it reads previews/exports without modifying saved state. Do one full browser pass after the work is complete; if it finds a bug, fix it and recheck that path. For a new design verify file discovery, every affected version, desktop/mobile width, fullscreen, theme controls, and absence of terminal/browser errors. For framework changes also verify favorites survive reload, layout saving, undo/redo, tabs, and a fresh checkout install. For emails verify downloaded HTML matches preview HTML, plain text is readable, and no localhost asset URLs remain in a deliverable.

A browser preview is not proof of Gmail/Outlook/Apple Mail rendering. State which clients were actually tested. Do not send email, deploy, publish, invite users, or add paid integrations unless the user authorizes that action.

## Storage and runtime limits

Local same-origin development writes only. A hosted production build is read-only. SQLite transactions coordinate review-state writes; use expected revisions and stable request IDs. Run one development server per workspace. Git owns source history; the database owns review history and needs backups. Undo and interactive component state are session-local. Do not share the database over a network drive, claim cross-machine synchronization or authenticated users, or disable origin/host checks to make a deployment editable.

Source code is trusted local code executed by the user's development server. Preview iframes isolate styles, not hostile code. Do not offer arbitrary remote code execution or claim sandboxing. Generated email previews prohibit scripts.

## Code

Use shadcn/ui for all standard studio UI controls. Reuse the checked-in components in `studio/ui/` (currently Button, Input, and the Radix-backed Select); add missing primitives from the official shadcn registry rather than hand-building replacements or using native selects. Keep control styling in those components and shared theme tokens; CSS Modules should handle canvas/layout geometry. Use `Button asChild` for action links and retain semantic Next links for route navigation. Follow `docs/ui.md` for component installation, portals, keyboard behavior, and consumer styling. Web designs should reuse the host's shared shadcn components when available; emails retain server-renderable, email-compatible components. The canvas's native `<dialog>` is fullscreen infrastructure, not a general-purpose modal pattern.

Use pnpm, TypeScript strict mode, named functions and `import type`. No `as any`, secrets, or unrelated dependency changes. Use relative imports within framework modules, explicit package subpaths from a host. Keep preview component imports out of the shared catalog/shell: one static route per version prevents every preview from joining the same module graph. Runtime boundaries do not isolate syntax/compiler failures.

Next.js documentation ships at `node_modules/next/dist/docs/`; consult the relevant guide before changing framework routing or server/client boundaries. This starter uses Next 16.3; use its installed types rather than assumptions from older Next versions.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
