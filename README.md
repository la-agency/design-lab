# Design Lab

A local visual workspace for designs authored by you and your coding agent. Compare versions on a canvas, resize previews, save favorites, and export email HTML and plain text. Your design files stay in your repository.

Upstream: [la-agency/design-lab](https://github.com/la-agency/design-lab). Add Design Lab inside your existing repository so designs can use your app's real components, styles, and tokens. It runs as its own local app. To return improvements to the studio itself, follow [CONTRIBUTING.md](CONTRIBUTING.md).

## Give this repository to your agent

Open your existing project with your agent and give it this repository link and prompt:

> Read Design Lab's README.md, AGENTS.md, and docs/integration.md, along with this project's agent instructions. Add Design Lab inside this repo as a separate local app with its framework pinned to an upstream commit, following our existing workspace structure. Reuse our UI components, styles, and tokens through shared imports. Preserve our production routes and package-manager setup. Record the installed revision and update/contribution workflow for future agents. Start the studio and open it in my browser. Walk me through our first design with sample data, keeping the included examples until I say otherwise. Run the checks and verify a shared component in the browser, including email export if applicable.

## Add to your existing repo (recommended)

A typical setup looks like this; adapt the paths to your repository:

```text
your-repo/
  apps/web/          # production app
  apps/design-lab/   # local studio and design versions
  packages/ui/       # components, styles, and tokens both apps import
```

Both apps use the same source through normal imports. Each design version wraps a component with sample props and any preview providers it needs. Adding the studio does not automatically configure styles, assets, or backend dependencies; the [integration guide](docs/integration.md#share-components-with-your-app) walks through that wiring.

Use **Node 22.14 or newer within Node 22** and **pnpm 10** for the studio. Follow [setup in an existing project](docs/integration.md#agent-setup-in-an-existing-project) to add it without overwriting the host app. A pinned upstream framework dependency keeps studio updates centralized; a copied framework snapshot also works. Both approaches can share your product's code.

Run the studio from its own app directory with `pnpm dev`, then open the URL printed in the terminal (normally **http://127.0.0.1:4204**). Use `pnpm dev --port 4214` if that port is occupied. Shared component edits affect both apps; keep experiments in design versions until you are ready to change the shared implementation.

## Standalone workspace (alternative)

Use this when you have no existing product repository or want an independent evaluation:

1. Open [LA Agency's Design Lab](https://github.com/la-agency/design-lab). On GitHub choose **Use this template → Create a new repository**. Give your repository its own name; keep it private for internal work. A normal clone also works for evaluation. The upstream repository is public; your workspace can be private.
2. Clone your new repository and open the folder with your coding agent.
3. Use **Node 22.14 or newer within Node 22**, and **pnpm 10**. Check `node --version` and `pnpm --version`. If pnpm is missing and Corepack is available, run `corepack enable` then `corepack prepare pnpm@10.0.0 --activate`.
4. Run `pnpm install --frozen-lockfile`, then `pnpm dev`.
5. Open **http://127.0.0.1:4204**. If that port is occupied, use `pnpm dev --port 4214` and open that port instead.

No database, Saasco checkout, environment file, paid service, or AI API key is required. Your coding agent runs separately; there is no built-in chat or drag-and-drop email editor.

## Make something

Paths below are relative to the design app directory, such as `apps/design-lab`. Edit `brand/guidelines.md`, then ask your agent:

> Make three pricing-page directions using our existing UI components and tokens. Put the explorations in a new design folder, with sample data. Keep review notes outside the designs.

For email work:

> Make three welcome email directions using my brand. Put them in a new design folder. Keep the designs themselves free of review notes.

A folder containing `design.json` and `versions/*.tsx` becomes a studio file. New versions appear automatically while `pnpm dev` is running. The included welcome email demonstrates email export; the landing page demonstrates ordinary React previews. See [the workspace guide](docs/workspace.md).

Favorites and canvas positions, sizes, groups, and background color are saved in `.studio/decisions.json` and `.studio/layouts.json`. Commit these alongside designs. Tabs/theme stay in this browser; undo history and interactive demo state last for the current session.

For email boards, **HTML** and **Text** download the rendered output. Sending and inbox-client testing happen in your chosen email platform. Verify real links, hosted images, subject/preview text, and personalization before sending. Read [email guidance](docs/emails.md).

## Commands

Run these from the design app directory. These are the starter's scripts; pinned consumers use the equivalent scripts described in the integration guide.

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

For a framework improvement, ask your agent: **“Improve this studio behavior and contribute it upstream.”** It should make the change in a separate upstream checkout, test a local package with your project, and open a PR. After merge, it updates your project's pinned dependency. Your product repo keeps its own Git remote; the framework checkout has the upstream or fork remote. Ordinary design work stays entirely in your product repo. This is an agent workflow, not an automatic synchronization service.

## Troubleshooting

- **Repository not found:** check the URL and access to your own workspace repository; upstream is `https://github.com/la-agency/design-lab`. For a private workspace using GitHub CLI, run `gh auth status` and `gh auth setup-git`. Never put a token in a URL or file.
- **No pnpm / wrong Node:** install Node 22 and pnpm 10, then reopen the terminal. Don't substitute npm or yarn.
- **Port in use:** choose another port. Don't terminate an unfamiliar process.
- **New design absent:** check the terminal for a manifest error; run `pnpm sync`. When explicitly listing pages, add each new version to one page.
- **Stale preview:** save the source, check terminal errors, then reload the preview. Changes to shared files outside `designs/` may require reloading an email preview.
- **Favorite/layout not saved:** keep the terminal running with `pnpm dev`, use its loopback URL, and check the visible error. `pnpm start` is read-only.
- **Broken design:** fix its component or remove its registration deliberately; never edit generated routes. A compile error can still interrupt the shared development server.

See [AGENTS.md](AGENTS.md) for the complete working contract.
