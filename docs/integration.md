# Integration and updates

Canonical source: [la-agency/design-lab](https://github.com/la-agency/design-lab). The package name is still `@la-agent/design-lab`; use that name for dependencies, imports, and `transpilePackages`. Moving GitHub organizations did not rename the package.

## Location and framework ownership

Put Design Lab inside the existing product repository by default, as its own local app such as `apps/design-lab`. This lets design versions import the same UI components, styles, tokens, and suitable utilities as the production app. Both apps can share source while keeping their routes, servers, and data separate. Use the repository's existing directory structure; the example paths are not mandatory.

Choose how that design app obtains its framework:

1. **Pinned framework consumer (preferred for ongoing updates):** the design app depends on this repository at a reviewed full commit SHA. Host adapters, designs, and product UI stay in the product repository; framework fixes come from upstream. Follow the [Next.js host setup](#nextjs-host).
2. **Framework snapshot:** copy the starter into the product repository, including `studio/` and `bin/`. It is self-contained, with manual framework updates. Follow the snapshot steps below.

Both approaches support shared product code. If there is no existing product repository, use GitHub's **Use this template** to create a standalone workspace instead; an ordinary clone also works for evaluation.

Do not assume template projects auto-update. Never copy a team's designs into the framework to distribute fixes.

## Agent setup in an existing project

Read that project's agent instructions and inspect its package manager, workspace configuration, Next/React versions, routes, and Git status before changing anything. The supported starter uses Node 22.14+ within Node 22, pnpm 10, Next 16.3.1, and React/React DOM 19.2.0. Other host versions need compatibility verification; do not silently upgrade a production app to fit this studio.

Default to a separate local design app inside the existing repo, for example `apps/design-lab`. Inspect existing UI packages first and follow [shared component setup](#share-components-with-your-app). Run commands from the design app directory: discovery and saved-state paths resolve from the current working directory. Use one writable development server per design workspace.

If the repo is not a pnpm workspace, assess its current structure before introducing one. A standalone studio subdirectory in the same repo is possible, but shared imports need explicit module resolution, dependency, build-root, and host typecheck configuration. Merely placing the folder there does not wire sharing. Do not migrate the host's package manager or move its production app just to install the studio. If a compatible setup would require that wider change, explain the concrete limitation and offer an independent evaluation checkout; do not describe it as working code sharing.

For a self-contained snapshot:

1. Clone upstream into a separate temporary checkout and record `git rev-parse HEAD` as the starting revision in the destination project's documentation. A new independent repository can instead use GitHub's template button.
2. In an existing project, copy the starter into a new, empty design app directory, excluding `.git`, `node_modules`, `.next`, generated files listed in `.gitignore`, and local environment files. Do not overwrite the production app. Keep `app/`, `studio/`, `bin/`, `studio.config.ts`, the TypeScript/Next configuration, sample designs, brand guidance, public assets, and authored `.studio/` state. Keep README, AGENTS, CONTRIBUTING, and docs with the design app so a future agent has these instructions. Preserve the parent project's instructions.
3. Keep the starter package name while it contains local framework source: its package exports resolve the `@la-agent/design-lab/*` imports. In a pnpm monorepo, ensure there is only one workspace package with this name and register the directory in `pnpm-workspace.yaml` if it is not already included.
4. For a standalone checkout, use `pnpm install --frozen-lockfile`. When deliberately adding a package to an existing pnpm workspace, use the workspace's root install to update its existing lockfile, review the dependency changes, then verify a frozen install. Do not replace an existing root lockfile with the starter's lockfile or create a competing nested lockfile. For another package manager, resolve the compatibility considerations above before installing.
5. Run `pnpm check`, `pnpm test`, and `pnpm smoke` from the design app. Start `pnpm dev` (or `pnpm dev --port 4214`), check its terminal output and HTTP response, and open the actual loopback URL. Follow the browser verification in AGENTS.md. Preserve the sample designs until the user requests their replacement.
6. Wire and verify a real shared component using the steps below. Record the app path, start command, local URL, starting upstream SHA, shared packages, and whether this is a snapshot or pinned consumer in the host's documentation. Link its agent instructions to the design app's AGENTS.md. Ask for the intended design, brand, and output when absent.

If centralized updates are needed, use the pinned-consumer setup below instead of maintaining copied framework source. There is no command that automatically installs routes into an arbitrary existing app.

## Share components with your app

Use the product's existing shared packages where available. For example:

```text
your-repo/
  pnpm-workspace.yaml
  apps/
    web/                      # imports @company/ui
    design-lab/               # also imports @company/ui
      designs/pricing/
        design.json
        versions/v1.tsx
  packages/
    ui/                       # package named @company/ui
```

`@company/ui` and `PricingCard` below are illustrative names: use real exports and props from the target repository. There is no built-in `@company/ui` package in Design Lab.

1. Ensure the app and shared package directories are included in the existing `pnpm-workspace.yaml`. Add `"@company/ui": "workspace:*"` to the design app's dependencies, then run the root `pnpm install` and review the lockfile. Keep the shared package's exported entry points and its own dependencies explicit. A React UI package should use compatible React peer dependencies so the studio does not load a second React instance.
2. Configure compilation and resolution. Keep `@la-agent/design-lab` in the design app's `transpilePackages` when consuming upstream source. The installed Next version automatically transpiles recognized workspace packages; if a dependency ships raw TS/JSX through `node_modules`, add its package name to `transpilePackages`. Ensure Turbopack's root includes both the design app and shared source; it detects the root using lockfiles, and unusual layouts may need an explicit absolute `turbopack.root`. Consult the host's installed Next docs before changing configuration. The production app's TypeScript aliases do not automatically apply to this separate app.
3. Import the shared component into a version, supplying sample data. Create `designs/pricing/design.json`:

   ```json
   { "title": "Pricing", "kind": "web", "width": 1440 }
   ```

   Then create `designs/pricing/versions/v1.tsx`, adapted to the actual component API:

   ```tsx
   import { PricingCard } from "@company/ui";

   export default function PricingExploration() {
     return <PricingCard name="Starter" price={29} />;
   }
   ```

   Use a client wrapper with `"use client"` when it needs hooks, browser APIs, or event handlers. Components needing auth, a router-specific context, or backend data need explicit preview providers and sample state; importing a production page may also import its server dependencies. Prefer the reusable presentation component.
4. Wire presentation dependencies inside the preview. Import the package's exported CSS/tokens, supply its theme/provider wrapper where required, and configure any Tailwind/PostCSS source scanning for the shared package. Each board is an iframe: it does not inherit the studio shell's context or styles. The stock generated web page uses the design app's root layout, so app-wide CSS there can also affect studio chrome; scope product styles or import them with an appropriate preview wrapper. Fonts and public assets must be available to the design app too: `/logo.svg` resolves against its origin, not the production server. Email previews render standalone HTML and need email-compatible markup and styles; browser UI components and scripts cannot simply be reused there.
5. Verify discovery, open the shared-component board at desktop and mobile widths, and check its styles, interactions, and browser/terminal errors. Make a small reversible edit to the shared source and verify it reaches the studio; revert that probe afterwards. Next handles imported web modules, but the studio's discovery watcher and preview fingerprints only track `designs/`. Shared-source email changes may require a manual preview reload. Verify email exports again after the edit when relevant.
6. Run the host's relevant checks as well as the design app's checks when shared source or configuration changes. Keep production builds independent of studio-only routes and experiments. Record the shared import paths and preview setup so the next agent can reuse them.

If components currently live only inside the production app, inspect their imports before reusing them. A direct source import can work when module resolution, styles, dependencies, and runtime assumptions are satisfied. Prefer extracting a small reusable piece into a shared package when appropriate; do not automatically reorganize the whole app. Preserve the production app's existing behavior and verify it after an extraction.

Experiments belong in design versions or nearby components until a shared change is intended. Changes to the shared package affect both apps, and older design versions importing it will show the new implementation too. Use Git to recover historical source. Choosing or approving a design does not automatically promote code into production: implement that change deliberately and verify both apps. Product UI improvements stay in the product repository; reusable studio framework improvements follow CONTRIBUTING.md.

## Next.js host

Install a reviewed revision in the host's package.json:

```json
{ "dependencies": { "@la-agent/design-lab": "git+https://github.com/la-agency/design-lab.git#FULL_COMMIT_SHA" } }
```

Replace FULL_COMMIT_SHA with a real reviewed 40-character commit from the repository; don't paste it literally. Use `gh auth setup-git` if Git cannot authenticate. Some pnpm/Git configurations record the dependency using GitHub SSH in the lockfile. In that case, the installing machine or CI also needs authorized GitHub SSH access, or an organization-approved URL rewrite to its existing HTTPS credentials. Keep tokens out of dependency URLs. Run pnpm install and commit the lockfile.

Set `transpilePackages: ["@la-agent/design-lab"]` in next.config.mjs. Use the same React version as the host to avoid duplicate React instances. The framework ships TypeScript and CSS Modules and is compiled by Next.

The package exposes explicit subpaths: shell, canvas, preview, history, types, files, workspace, decisions, layouts, error, route-error, globals.css, and sync. See package.json for their source files and types.

The Git package includes framework source, binaries, and documentation; it does **not** scaffold the starter's app adapters, designs, or configuration into your host. Use a checkout of the same pinned revision as the reference for those files. Rename the consumer's own package to its project name before adding the dependency, so it does not shadow `@la-agent/design-lab`.

For the stock folder-discovery setup, retain or adapt these host files:

| Host files | Purpose |
| --- | --- |
| `app/layout.tsx`, `app/page.tsx` | Shell, global CSS, generated catalog, and home view |
| `app/files/[file]/page.tsx`, `exploration/page.tsx`, `final/page.tsx` | Design navigation and canvas/result views |
| `app/api/design-decisions/route.ts`, `app/api/layouts/route.ts` | Local state handlers using the Node.js runtime |
| `app/error.tsx`, `app/global-error.tsx`, `app/previews/error.tsx` | Error boundaries |
| `studio.config.ts`, `next.config.mjs`, `tsconfig.json` | Workspace identity, compilation, and type checking |
| `designs/`, `brand/`, `public/`, authored `.studio/` JSON | Host-owned content and saved state |
| `.gitignore` entries for the generated catalog and routes | Keep generated code out of Git |

Use the installed binary in the consumer's scripts:

```json
{
  "dev": "design-lab dev",
  "sync": "design-lab sync",
  "check": "design-lab sync && next typegen && tsc --noEmit",
  "build": "design-lab sync && next build",
  "start": "next start --hostname 127.0.0.1 -p 4204"
}
```

Install the host's Next, React, React DOM, TypeScript, and type dependencies using the starter versions as the tested baseline. Keep dependencies imported directly by your designs (for example `@react-email/components` or `lucide-react`) in the host too; do not rely on transitive dependency hoisting. Keep the host's own test/smoke commands, adapting the starter's `bin/smoke.mjs` if needed; `design-lab` exposes only `dev` and `sync`.

The stock generator writes a root `app/` directory and uses `/files`, `/previews/generated`, and `/api/exports`; the shell also expects `/api/design-decisions` and `/api/layouts`. It does not automatically support a `src/app` layout, a `/design-lab` mount prefix, or conflicting production routes. Use a separate design app for these cases, or implement and verify custom host adapters. Do not copy the starter's root layout over an existing application's layout.

- Mount `LabShell` with serializable `files` and `config`. Render your workspace children inside it.
- `CanvasStudy` takes pages and a renderBoard function. `PreviewBoard` takes a board and its same-origin preview URL.
- Wire `/api/design-decisions` with `createDecisionHandlers({ files })` and `/api/layouts` with `createLayoutHandlers({ files })`. Paths default to the host's `.studio/` directory; a trusted host can supply another fixed path.
- Existing apps can supply their own registry, routes and renderers. They need not migrate every design into folder discovery at once.
- To use conventions, use the starter app adapters and the installed `design-lab dev` / `design-lab sync` binary. The binary resolves Next from the host and scans the current working directory.
- A monorepo can share UI source while keeping production builds and runtime independent of studio-only routes and experiments. Run each design host on a separate loopback port and keep its credentials/data separate.

## Updating template-created workspaces

For snapshots, record the last adopted upstream SHA and compare it with the reviewed target SHA in an upstream checkout. Port the relevant changes to `studio/`, `bin/`, tests, docs, and required dependencies/configuration into your workspace on a branch. A template-created repository has unrelated history: do not use a blanket Git merge, `--allow-unrelated-histories`, or reset it to upstream. Keep workspace content and saved state intact. Resolve local framework modifications deliberately, run the checks and browser pass in AGENTS.md, then record the newly adopted SHA.

For ongoing centralized updates, convert it into a consumer: rename its package to its own project name, add the upstream Git dependency pinned to a reviewed commit, replace local `node bin/design-lab.mjs` scripts with the installed `design-lab` binary, and then remove the now-unused local framework source once verified. Imports already use package subpaths. Keep designs, assets, configuration, app adapters and saved state. Run a clean install, typecheck, tests, and browser verification before accepting the conversion.

Pinned consumers adopt a merged fix by updating the dependency to the merged upstream commit's full SHA, running `pnpm install`, and committing the reviewed manifest and lockfile changes. Verify with a frozen install, host checks/tests, and a browser pass. Merge upstream first; a contributor's branch SHA is not a shared release. Keep the previous pin available for rollback. Neither approach auto-updates when upstream changes.

## Returning improvements upstream

Follow [CONTRIBUTING.md](../CONTRIBUTING.md) for the complete workflow from a template copy or consuming app: reproduce against current upstream, port only reusable changes, validate, and open a pull request against `la-agency/design-lab`. Fixes in a private workspace or edited `node_modules` do not reach other users automatically.

## Framework development

Change studio/ and bin/, update behavior tests and documentation, run pnpm check and pnpm test, then test the starter and a real consuming app. Use a local pnpm pack tarball for pre-publication integration; commit-pin the final Git revision in consumers. A Git dependency must not rely on source outside this repository, a developer's absolute paths, local symlinks, generated output missing from the package, or private environment variables.
