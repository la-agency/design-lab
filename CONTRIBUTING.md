# Contributing improvements

The shared app lives at [la-agency/design-lab](https://github.com/la-agency/design-lab). Changes to your own template copy or consuming project stay there until a pull request is merged upstream. Publishing a contribution and merging it are separate actions; agents should follow the user's authorization for each.

## What belongs upstream

Share reusable fixes and improvements to `studio/`, `bin/`, tests, documentation, and required host adapters/configuration. Include a small fictional example when a bug needs one. Keep company designs, brand assets, customer data, saved selections/layouts, secrets, and project-specific integrations in the original workspace. Check the complete diff before pushing: upstream is public.

Keep framework changes in separate commits from design work whenever possible. Read [AGENTS.md](AGENTS.md) and [integration guidance](docs/integration.md) before changing the framework. The package name remains `@la-agent/design-lab`, even though its GitHub owner is `la-agency`.

## Bring a fix back from your copy

1. Describe the behavior you changed, how to reproduce the original problem, and the upstream SHA your workspace started from (if known). Check whether current upstream already fixes it.
2. Create a separate checkout of upstream, using a new directory, so your working design project stays intact:

   ```sh
   git clone https://github.com/la-agency/design-lab.git design-lab-contribution
   cd design-lab-contribution
   git switch -c codex/describe-your-fix
   ```

   If you already have an upstream checkout or fork, use a clean branch based on the current upstream default branch instead. Do not reset or discard existing local work.

3. Port only the reusable changes into this checkout. A template-created repository is not a GitHub fork and has unrelated history; do not push its entire branch or merge its history into upstream. Manually port a small fix, or use a reviewed patch of named framework files. Cherry-pick only when the commit is isolated and all its changes belong upstream. Adapt the fix to current upstream instead of overwriting whole directories from an older copy.
4. For a pinned consumer, make the fix in the upstream checkout, not in `node_modules` or pnpm's store. Build a local package with `pnpm pack --pack-destination /tmp/design-lab-pack` and test that tarball in a disposable copy of the consumer. Keep temporary `file:` dependencies and machine paths out of the final contribution and consumer lockfile.
5. Add a meaningful regression test for a behavior fix, update any affected documentation, and perform the verification below. Use fictional fixtures rather than copying private workspace content.
6. Inspect `git diff` and `git status`, stage only intended files, and commit the change. Record any verification that could not be completed.

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
