# Contributing improvements

The shared app lives at [la-agency/design-lab](https://github.com/la-agency/design-lab). Changes to your own template copy or consuming project stay there until a pull request is merged upstream. Publishing a contribution and merging it are separate actions; agents should follow the user's authorization for each.

## What belongs upstream

Share reusable fixes and improvements to `studio/`, `bin/`, tests, documentation, and required host adapters/configuration. Include a small fictional example when a bug needs one. Keep company designs, brand assets, customer data, saved selections/layouts, secrets, and project-specific integrations in the original workspace. Check the complete diff before pushing: upstream is public.

Keep framework changes in separate commits from design work whenever possible. Read [AGENTS.md](AGENTS.md) and [integration guidance](docs/integration.md) before changing the framework. The package name remains `@la-agent/design-lab`, even though its GitHub owner is `la-agency`.

## Agent workflow for a framework improvement

For pinned consumers, start framework edits in an upstream checkout. The agent handles the checkout, local package test, and PR; the user should not need to manually move patches between repositories. Product designs and shared product components continue to be edited in the product repository.

1. Read the consumer's setup record, dependency manifest, and lockfile to identify its installed upstream SHA. Describe the problem and reproduce it with that version. Check whether current upstream already fixes it; if so, use the update workflow instead of creating another fix.
2. Reuse a suitable upstream checkout or create one outside the product repository, using a new directory. Start a contribution branch from the current upstream default branch:

   ```sh
   git clone https://github.com/la-agency/design-lab.git design-lab-contribution
   cd design-lab-contribution
   git switch -c codex/describe-your-fix
   ```

   If you already have an upstream checkout or fork, use a clean branch based on the current upstream default branch instead. Do not reset or discard existing local work.

3. Make the reusable fix in this upstream branch, including a meaningful regression test for a behavior fix and affected documentation. Do not edit installed `node_modules` or pnpm's store. Use fictional fixtures rather than copying private workspace content. Host-specific integration fixes belong in the product repo; update the starter adapters upstream too only if the issue applies generally.
4. Run the upstream verification below. Build a local package with `pnpm pack --pack-destination /tmp/design-lab-pack`, noting the actual archive path printed by pnpm. Use a new output directory for each candidate so a cached archive cannot conceal an edit.
5. Test it in a disposable checkout of the consuming product, including the relevant designs and shared packages. Preserve any uncommitted user work needed for reproduction in that disposable copy without publishing it. Temporarily replace only the design app's framework dependency with `file:/absolute/path/to/the-printed-archive.tgz`; substitute the actual path. Install from the workspace root, run the consumer's checks, and verify the changed behavior in its browser preview. Repack and reinstall for each new candidate. This tests the package as a consumer receives it, including its packaged files.
6. Inspect the upstream diff, stage intended files, and commit the change. [Open a PR](#open-a-pull-request) from this branch when contribution is authorized. Report the PR URL, upstream commit, tested consumer revision, and any incomplete checks. Keep the original consumer on its existing pin while review is pending; a local test does not mean the improvement is available upstream.
7. After the PR is merged, verify its actual merged commit SHA (which may differ after squashing). Update the original consumer's Git dependency to that SHA, reinstall, verify a frozen install and the consumer checks/browser path, then commit its manifest, lockfile, and updated setup record. The final consumer diff must contain no temporary `file:` dependency, local checkout path, or test override. Preserve unrelated changes. If review is still pending, leave a clear next step rather than claiming adoption is complete.

## Recover a fix already made in a snapshot

A template-created repository is not a GitHub fork and has unrelated history. If a fix was already made in that copy, use the upstream checkout workflow above and port only its reusable changes. Manually port a small fix, or use a reviewed patch of named framework files. Cherry-pick only when the commit is isolated and all its changes belong upstream. Adapt it to current upstream instead of overwriting whole directories from an older copy. Do not push the product's entire branch or merge unrelated histories. After merge, use the snapshot update procedure or convert the workspace to a pinned consumer.

## Validate the contribution

Use Node 22.14+ within Node 22 and pnpm 10:

```sh
pnpm install --frozen-lockfile
pnpm check
pnpm test
pnpm smoke
```

Follow the browser pass in AGENTS.md. Framework changes also need a fresh-checkout install and verification in a real consuming app; use a local tarball before the fix is merged. Document the tested host versions. Documentation-only changes need link/example review; they do not require pretending a browser or email-client rendering test was performed. CI runs the install, check, test, and smoke commands, but does not replace manual browser or consumer verification.

## Open a pull request

If you have upstream write access, push your contribution branch to upstream and open a PR. Otherwise, fork `la-agency/design-lab` on GitHub and push the branch to that fork. A fork for a reusable fix is separate from the template-created repository holding your designs. Example from the contribution checkout, replacing `YOUR_GITHUB_LOGIN` with your actual account after creating the fork:

```sh
git remote add fork https://github.com/YOUR_GITHUB_LOGIN/design-lab.git
git push -u fork HEAD
gh pr create --repo la-agency/design-lab --head YOUR_GITHUB_LOGIN:codex/describe-your-fix
```

Use your actual branch name. If a remote already exists, inspect its URL instead of replacing it blindly. `gh pr create` prompts for a title and description. Include the problem, resulting behavior, regression/validation results, and any consumer migration needed. Include screenshots for visible UI changes. If you cannot publish code, prepare the reviewed patch and explanation locally and report the access blocker.

A maintainer reviews and merges the PR. Do not directly push a fix onto the upstream default branch or merge a PR without authorization. After merge, update your original workspace using [the snapshot or pinned-consumer update steps](docs/integration.md#updating-template-created-workspaces). Other users receive the improvement when they adopt that upstream revision; copies do not update automatically.
