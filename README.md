# Design Lab

A local visual workspace for designs authored by you and your coding agent. Compare versions on a canvas, resize previews, save favorites, and export email HTML and plain text. Your design files stay in your repository.

Upstream: [la-agency/design-lab](https://github.com/la-agency/design-lab). Start a separate workspace below, or follow [integration and updates](docs/integration.md) to add a local design app to an existing project. To return improvements from your copy, follow [CONTRIBUTING.md](CONTRIBUTING.md).

## Give this repository to your agent

> Read README.md and AGENTS.md. Set up this Design Lab locally, start it, and open it in my browser. Walk me through replacing the sample brand and creating my first design. Preserve the samples until I say otherwise. Run the checks and verify my design in the browser, including email export if applicable.

## Start your own workspace

1. Open [LA Agency's Design Lab](https://github.com/la-agency/design-lab). On GitHub choose **Use this template → Create a new repository**. Give your repository its own name; keep it private for internal work. A normal clone also works for evaluation. The upstream repository is public; your workspace can be private.
2. Clone your new repository and open the folder with your coding agent.
3. Use **Node 22.14 or newer within Node 22**, and **pnpm 10**. Check `node --version` and `pnpm --version`. If pnpm is missing and Corepack is available, run `corepack enable` then `corepack prepare pnpm@10.0.0 --activate`.
4. Run `pnpm install --frozen-lockfile`, then `pnpm dev`.
5. Open **http://127.0.0.1:4204**. If that port is occupied, use `pnpm dev --port 4214` and open that port instead.

No database, Saasco checkout, environment file, paid service, or AI API key is required. Your coding agent runs separately; there is no built-in chat or drag-and-drop email editor.

## Make something

Edit `brand/guidelines.md`, then ask your agent:

> Make three welcome email directions using my brand. Put them in a new design folder. Keep the designs themselves free of review notes.

A folder containing `design.json` and `versions/*.tsx` becomes a studio file. New versions appear automatically while `pnpm dev` is running. The included welcome email demonstrates email export; the landing page demonstrates ordinary React previews. See [the workspace guide](docs/workspace.md).

Favorites and canvas positions, sizes, groups, and background color are saved in `.studio/decisions.json` and `.studio/layouts.json`. Commit these alongside designs. Tabs/theme stay in this browser; undo history and interactive demo state last for the current session.

For email boards, **HTML** and **Text** download the rendered output. Sending and inbox-client testing happen in your chosen email platform. Verify real links, hosted images, subject/preview text, and personalization before sending. Read [email guidance](docs/emails.md).

## Commands

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Discover designs, watch folders, start the local studio on 4204 |
| `pnpm dev --port 4214` | Use another loopback port |
| `pnpm sync` | Validate manifests and regenerate routes/catalog |
| `pnpm check` | Sync, generate Next route types, and typecheck |
| `pnpm test` | Framework, discovery, and storage tests |
| `pnpm smoke` | Start a temporary server on 4298 and verify every preview and email export |
| `pnpm build` | Build this standalone studio |
| `pnpm start` | Serve a built, read-only preview locally |

Writes are intentionally restricted to same-origin local development. A deployed preview is not a collaborative editor. Do not expose the dev server to the internet. Shared deployment needs authentication and a durable storage design. Fullscreen uses the browser viewport; use the canvas width controls for a specific mobile width.

## Framework vs workspace

`studio/` and `bin/` implement the reusable framework. `designs/`, `brand/`, `public/`, `.studio/decisions.json`, and `.studio/layouts.json` are your work. `app/` is a small Next.js host. Generated catalog and preview/export routes are ignored by Git and recreated by `pnpm sync`.

This repository is both the starter and the framework source. Template-created projects initially have a self-contained framework snapshot; they do not automatically receive fixes. A separate application can consume the original framework as a commit-pinned Git dependency, as documented in [integration and updates](docs/integration.md). No package registry login is needed. The package/import name remains `@la-agent/design-lab`; the GitHub organization is `la-agency`.

Keep reusable app fixes separate from your brand, designs, and saved workspace state. [CONTRIBUTING.md](CONTRIBUTING.md) explains how to open an upstream pull request from a template copy, fork, or consuming project, and how other workspaces adopt a merged fix.

## Troubleshooting

- **Repository not found:** check the URL and access to your own workspace repository; upstream is `https://github.com/la-agency/design-lab`. For a private workspace using GitHub CLI, run `gh auth status` and `gh auth setup-git`. Never put a token in a URL or file.
- **No pnpm / wrong Node:** install Node 22 and pnpm 10, then reopen the terminal. Don't substitute npm or yarn.
- **Port in use:** choose another port. Don't terminate an unfamiliar process.
- **New design absent:** check the terminal for a manifest error; run `pnpm sync`. When explicitly listing pages, add each new version to one page.
- **Stale preview:** save the source, check terminal errors, then reload the preview. Changes to shared files outside `designs/` may require reloading an email preview.
- **Favorite/layout not saved:** keep the terminal running with `pnpm dev`, use its loopback URL, and check the visible error. `pnpm start` is read-only.
- **Broken design:** fix its component or remove its registration deliberately; never edit generated routes. A compile error can still interrupt the shared development server.

See [AGENTS.md](AGENTS.md) for the complete working contract.
