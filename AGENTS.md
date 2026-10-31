# Marfa docs

The source of the public documentation site at `docs.marfa.so` and the status page at `status.marfa.so`: Fumadocs on TanStack Start, deployed as two Cloudflare Workers. The docs follow the contract and the API description in withmarfa/marfa, which are the source of truth (`STYLE.md`, "Truth").

## Instruction files

- Before adding, moving or wiring a page under `content/docs/`, read `content/AGENTS.md`. Before writing one, read `STYLE.md`, the one place the writing rules live.
- Before changing `src/`, read `src/AGENTS.md`: the agent surfaces, analytics and the status page.
- Each `AGENTS.md` has a `CLAUDE.md` symlink beside it. Edit the `AGENTS.md`, never the link.
- Put no `.md` file under `content/docs/`. The docs collection reads every `.md` and `.mdx` file there as a page, so an instruction file there fails the build for want of frontmatter, or is published.

## Conventions

- American English in code, comments and commits. Pages follow `STYLE.md`.
- Conventional Commits with a scope, such as `docs(build):` or `fix(mcp):`. Work reaches `main` only through a pull request, one logical change each.
- Make worktrees in `.claude/worktrees/` (`git worktree add .claude/worktrees/<name> -b <branch> origin/main`). Once the work is merged, remove the worktree and its local branch (`git worktree remove`, then `git branch -D`, because git sees a squash-merged branch as unmerged) and run `git pull --ff-only` on `main`. If git refuses a removal, report it rather than forcing it.
- TypeScript and ESM. pnpm with the committed lockfile, on Node 22.22.2 or later (24.15 or later on Node 24), which jsdom, the component tests' DOM, requires; TanStack Start, Vite and Vitest need only 22.12. CI uses Node 22.
- This repository is public. Commit no internal hostname, private IP address, personal path, key or token, in a page or anywhere else.
- A comment says only what the code cannot: the reason, the constraint or the trade-off. It never names a tracker, ticket number or project phase.
- A code change in another repository opens a docs issue here, not a docs pull request. Pages are rewritten whole from those issues after each Marfa release ("Docs pass at each release").
- Pages have word limits that fail `pnpm test`: 900 words for a concept, 1,500 for a guide, a tutorial or a Catalog connector page, and a limit of its own for each lookup page. `src/lib/page-limits.json` holds the exceptions, each with a reason, and a ceiling for each page that is over its limit until it is rewritten (`STYLE.md`, "Less is clearer"). Remove a ceiling when a rewrite brings its page under the limit.

## Layout

- `content/docs/`: the pages, one folder per tab, ordered by `meta.json` files.
- `src/routes/`, `src/lib/` and `src/components/`: the docs site, including the Worker entry `src/server.ts`, the Markdown copies, `llms.txt`, the docs MCP server at `/mcp` and the JSON addresses under `/api/docs/`.
- `src/status/`: the status page, a second Vite target built by `vite.status.config.ts` into `dist-status/` and deployed from `wrangler.status.jsonc`.
- `src/generated/` and `openapi.json`: written only by the sync scripts. Never edit them by hand.
- `scripts/`: the sync from marfa, the changelog sync and the staleness report. The changelog sync and the report use only Node built-ins, because CI runs the report without installing anything. Their tests are in `src/lib/`, the only place Vitest looks.
- `.github/scripts/`: the CI change classifier and the publish checks, each with a `.test.sh` beside it, and the sync script's test.
- `public/`: static files for both targets.

## Commands

```bash
pnpm install          # also generates .source/
pnpm dev              # the docs site, http://localhost:3000
pnpm exec vite dev -c vite.status.config.ts   # the status page, port 3001
pnpm build            # the docs site, with a full prerender
pnpm build:status     # the status page
pnpm types:check      # fumadocs-mdx, then tsc for each target
pnpm test             # vitest, including the content lint and MCP conformance
bash .github/scripts/<name>.test.sh   # the tests for one shell script
```

- Run `pnpm build` and `pnpm build:status` before `pnpm types:check`. Each build generates a route tree, and both trees register paths in one global interface, so without both builds the other target's route types become `undefined`.
- `pnpm deploy` is a pnpm built-in that does not run the script. The fallback when `Publish` cannot deploy is `pnpm run deploy` or `pnpm run deploy:status` from an authenticated shell.

## Syncing from marfa

```bash
MARFA_ROOT=/path/to/marfa scripts/sync-from-marfa.sh   # defaults to ../marfa
```

- Use a marfa checkout on an up-to-date `main` with its tags fetched. The script copies committed files and runs nothing, and it checks every input before it writes anything. Its header lists what it writes.
- After an API, glossary, CLI, contract table or release change lands in marfa, run the sync and open a sync pull request. A code change opens a docs issue, not a docs pull request (`STYLE.md`, "Keeping pages current").
- Fix a gap in `openapi.json` or a generated table in marfa's generator, never here.
- The script takes only what marfa generates and commits: a file of its own, Markdown between markers, or a committed data file such as `builtin_catalog.json` and the schemas in `openapi.json`, which it renders into tables and lists under labels with no sentence of its own. What a value means is written on the page that includes the file. A list marfa does not generate gets a source there first.
- The script also writes the command tree, `src/generated/cli-commands.json`, from the same `COMMANDS.md`: every command with its options. `src/lib/command-check.test.ts` checks the pages' commands and options against it (`STYLE.md`, "Examples"), so a CLI change that renames or removes a command fails the next sync pull request on every page that still names it.
- After changing the script, run `.github/scripts/sync-from-marfa.test.sh`. It pins what the script writes and every input it refuses.

### The changelog

```bash
node --experimental-strip-types scripts/sync-changelog.ts   # GITHUB_TOKEN is used when set
```

- The Changelog page is built from the GitHub release notes of withmarfa/marfa, never written by hand. The script reads the published releases and writes `src/generated/changelog.json`, newest first, from `FIRST_VERSION` in the script (earlier releases were written in an older shape and stay on GitHub). It skips drafts and pre-releases.
- Run it after each Marfa release's notes are written, and open a pull request with the file. The release notes have a fixed shape, which `src/lib/changelog.ts` reads: a summary, an optional `**Breaking:**` paragraph, a `###` section for each part (Server, CLI, Core, TypeScript SDK, Swift SDK) and a `**Full changelog:**` link. Fix a wrong note on the release in GitHub and run the script again.
- `source.config.ts` writes the same releases into the page's Markdown copy.

## Docs pass at each release

After each Marfa release, one docs agent works the open docs issues and rewrites each page they name whole, to `STYLE.md`. Nobody else edits a page for a code change. The staleness report is the backstop: it finds the pages that cite something a release changed and that no issue named. It names pages to read again, never asks for a change, and "no change needed" is a normal answer.

1. If no docs commit has synced the new release tag, run the sync and merge its pull request first. Run the changelog sync once the release's notes are written.
2. Work the open docs issues. Close each when its page is right.
3. Find the commits that synced the previous release and the new one, and run the staleness report between them:

   ```bash
   git log --format='%h %ad %s' --date=short -- src/generated/marfa-release.json
   git show <commit>:src/generated/marfa-release.json   # which release a commit synced
   node --experimental-strip-types scripts/staleness-report.ts <previous-release-commit> <new-release-commit>
   ```

4. Read each page it lists that no issue covered against the contract and the API description. Rewrite a page whole if it is out of date, and leave it alone if it is right. Do the pages under "chapter changed" last.

On a pull request, the `Docs reports` job writes the same report to the job summary when `openapi.json` or `src/generated/contract-index.json` changed. It cannot fail the job.

## CI and publishing

- `CI` runs on every pull request and every push to `main`. `Full CI` (named `Draft CI` while the pull request is a draft) is a roll-up of `Build and type-check`, and with `Pull request description` it is a required check, so never add `paths` filters to `ci.yml`: a filtered-out run leaves the check pending. `.github/scripts/ci-changes.sh` skips the build only for root `AGENTS.md`, `CLAUDE.md`, `README.md` and `LICENSE`, the agent directories, `.githooks/` and the GitHub templates, and runs the sync script's test only when `scripts/sync-from-marfa.sh`, its test or `ci.yml` changed.
- A pull request description follows the organization's template: `Pull request description` fails it otherwise (`scripts/check-pr-description.ts`).
- A newer push cancels a pull request's earlier run; a push to `main` is never cancelled.
- Every workflow runs on GitHub-hosted `ubuntu-latest`. The `CodeQL` workflow owns code scanning, so GitHub's default CodeQL setup stays off.
- **Merging to `main` publishes.** `Publish` runs when `CI` succeeds on `main`. Each Worker has its own job, which deploys only when something that target builds from changed since the commit the site serves, then fails unless the site's `/version.json` reports the deployed commit.
- **Never build both targets and then deploy in one tree.** The Cloudflare plugin writes one deploy pointer per project root and every build rewrites it, so a bare `wrangler deploy` deploys whichever target built last. `deploy:status` passes the config its own build emitted.
- `Publish` has no schedule. Run it by hand with `mode` set to `check` to compare each live commit with `main` and check that the status store is still written, or to `publish` to deploy. `target` limits it to `docs` or `status`. Nothing reports outside GitHub: a red run is the signal.
- Deploying uses the `CLOUDFLARE_API_TOKEN` secret and the `CLOUDFLARE_ACCOUNT_ID` variable. The analytics key is the `POSTHOG_PROJECT_KEY_SITES` variable, passed to the build as `MARFA_POSTHOG_KEY`. Never commit any of them.

## Code Review Rules

Report only a problem you can show: name the page, input or step, and what goes wrong. Leave formatting, and what the content lint and CI catch, to them. `content/AGENTS.md` and `src/AGENTS.md` add rules for their areas.

- **Untrue against marfa.** Flag a Marfa name, field, error code, rule or example that marfa's contract, `openapi.json` or code contradicts. Safe path: check it there and link the rule's heading.
- **Generated file edited.** Flag a hand edit under `src/generated/` or to `openapi.json`. Safe path: fix the source in marfa and run the sync.
- **Publishing weakened.** Flag a `paths` filter on `ci.yml`, a deploy that can run where both targets were built, a self-hosted runner, or a publish job that no longer checks `/version.json`.
- **Worker route frozen.** Flag a change to the prerender filter in `vite.config.ts` that saves `/` or freezes `/version.json`, `/mcp` or anything under `/api/` as a static file.
- **Private detail committed.** Flag a token, key, account ID, internal hostname or personal path in a tracked file.
- **Stale instructions.** Flag a change that leaves an `AGENTS.md`, `STYLE.md`, the README or a comment untrue, and fix it in the same pull request.
