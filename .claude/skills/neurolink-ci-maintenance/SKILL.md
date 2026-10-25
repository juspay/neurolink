---
name: neurolink-ci-maintenance
description: "Use when changing NeuroLink CI or generated artifacts: docs/api and docs-site generators and their currency checks, pnpm --dir docs-site scripts, the time-dependent pnpm audit security gate and dependency overrides, or whether CI should have ffmpeg or other tools."
---

# CI, generators and the advisory gate

Moved out of the root CLAUDE.md. The required-status-checks section is still in the root CLAUDE.md; stacked-PR and merge playbooks are in the `neurolink-pr-merge` skill.

## ⚠️ A "regenerate and diff" check needs a reproducible generator first

`docs/api` currency works because typedoc is a pure function of the source.
`docs-site/static/{llms.txt,llms-full.txt,search-index.json}` were not, and a
naive currency check over them would have been **permanently red** — the same
shape of always-failing required check the ffmpeg incident below produced.

(Only `search-index.json` is committed now. The two llms files are gitignored:
they are not in package.json `files`, so they never shipped, and committing a
9.5 MB whole-file regeneration conflicted on nearly every docs pull request.
The reproducibility lesson below still stands — it is what lets the remaining
artifact be diffed at all.)

Two separate causes, and the second is the one that hides:

1. `build-llms-txt.ts` stamped `new Date().toISOString()` into both llms files.
   Obvious once you look, and trivially fatal to any diff.
2. `docFiles.sort((a, b) => a.order - b.order)` is **not a total order** — many
   files share one `order`. `Array.prototype.sort` is stable, so ties fell back
   to the input order, which came from `glob()`, which is filesystem order. Two
   consecutive builds of an unchanged tree differed by **215,862 lines**.
   `sortSections` had the same defect: every section outside `SECTION_ORDER`
   scores 999, so their ties came from Map insertion order.

Both are fixed **in the llms generator**, and those two artifacts are now
byte-identical across runs.

**`search-index.json` was not fixed with them, and this file said otherwise for
months.** The fix commit `ef125b2bd` touched five paths — the workflow, this
file, `build-llms-txt.ts`, and the two llms artifacts. `grep -c search-index`
over that file list returns 0. Its generator,
`docs-site/plugins/docusaurus-plugin-search-index/index.js`, walked
`fs.readdirSync` with no sort at all and numbered entries with a positional
counter (`objectID: String(id++)`), so any reordering rewrote every later id and
turned a one-file change into a whole-file diff; a rebuild on an unchanged tree
differed by ~1,640 positions. That was the only one of the three artifacts still
committed, and so the only one a currency check actually diffs.

It was fixed later, in `86487c287` (issue #1749): the walk sorts by code point,
and each `objectID` is a sha256 of the entry's URL, with a suffix on a repeated
URL or heading. Two builds of one tree now give byte-identical indexes, and
`docs-site/scripts/test-search-index-reproducibility.cjs` fails if either fix
regresses.

The reason the claim survived is the lesson restated. `ef125b2bd`'s message said
the change "leaves search-index.json byte-identical" — true of the run that was
observed, and never a property established in code. An observation from one run
was written down as an invariant, in the very section warning against exactly
that. So: when adding any generator whose output is committed, prove it by
building twice and `cmp`-ing, before writing a check that assumes it — and
before writing down that it holds. Tiebreak with a codepoint
comparison, not `localeCompare` — collation depends on the Node ICU build, so
it can order CI and a laptop differently.

Note also why the artifacts drifted in the first place, and why the check lives
on the pull request rather than in `docs-deploy.yml`: that workflow runs
post-merge with `contents: read`, and giving it write access would not help,
because a push to `release` from outside a pull request carries no check runs
and is declined by branch protection. See the required-status-checks section
in the root `CLAUDE.md`.

## ⚠️ `pnpm --filter ./docs-site` matches nothing and exits 0

`pnpm-workspace.yaml` deliberately sets no `packages:` field — the cooldown
policy lives there, and `docs-site/` stays an independent project. So a
`--filter ./docs-site` selector matches no project. pnpm prints _"No projects
matched the filters"_ and **exits 0**, which means every script written that way
succeeds while doing nothing.

The four `docs:*` scripts were written that way, including the `docs:build` that
the artifact-currency check printed as its own remediation. Running exactly what
the error message told you to run left the artifacts stale and reported success.
Use `pnpm --dir docs-site <script>`, which does not depend on workspace
membership.

The general trap: a command that exits 0 is not evidence it did anything. Check
that the work landed — a changed file, a written artifact — not the status code.

And the sharper version of that trap: the artifact **was** written, and is still
wrong. `pnpm run docs:api` used to do exactly this whenever the checkout's
absolute path contained a directory named `test`. `typedoc.json` excluded
`**/test/**`, typedoc matches `exclude` against absolute paths, and
`cleanOutputDir` wipes the output first — so every file under `src/lib/` was
excluded, the entry point converted to an empty module, and the run deleted 3545
of 3546 files and wrote the module README. Exit 0. No errors, no warnings,
`markdown generated at ./docs/api`, and a working tree holding a mass deletion
that looked like a clean regeneration.

It is not a hypothetical path: `workforge create -t test -n <name>` puts the
worktree under a directory named for the branch type, so any worktree opened for
test work sat on it. Two worktrees at the same commit, same lockfile, same
`tsc --listFiles` output of 4847 files, disagreed by 3545 files, and neither
reinstalling nor rebuilding changed anything — the only difference was the path.

The pattern is now anchored to the project root (`./test/**`), which cannot
match an ancestor of the repository. When adding an `exclude`, `ignore` or
`files` pattern to any tool config, anchor directory patterns to the root:
a bare `**/<name>/**` is a claim about every directory between `/` and the
repository, not just the one you meant. CI never saw this — GitHub checks out at
`/home/runner/work/neurolink/neurolink` — which is its own lesson about where a
path-dependent bug hides.

## ⚠️ The advisory gate is time-dependent: a green run expires

`scripts/security-check.ts` — the "🔒 Security & Environment Validation" step
inside `test-shards (validate)`, and therefore inside the required `test`
check — runs `pnpm audit --prod --json` **live** against the advisory
database. Nothing about its verdict is pinned to the commit.

Two consequences, both of which have already produced wrong conclusions here:

**A pull request's green is a statement about when it ran, not about its
diff.** When the js-yaml and hono advisories were published, one PR's
`validate` shard had run at 20:05 UTC and passed; another ran at 02:03 UTC
and failed. Identical dependency trees. The first PR looked green and
mergeable and was neither — a re-run would have failed it. **Do not treat a
green `test` older than the newest advisory publication as current**, and
never conclude from "this PR is green and that one is red" that the
difference is in their diffs.

**A red gate usually is not yours.** Because the audit is repo-wide and
live, a newly published advisory turns `test` red on _every_ open pull
request simultaneously, including ones that touch no manifest at all. The
check's own output says so — it appends a note about the branch being behind
`origin/release` and warns that the failure "may not originate in your
changes." Before investigating your own diff, reproduce on the untouched
`release` tip:

```bash
# A fixed path is not re-runnable: the second call dies with
# `fatal: '/tmp/nl-audit' already exists` instead of auditing. Take a unique
# directory, and remove the worktree outside the `&&` chain so a failed audit
# still cleans up after itself. The chain sits in an `if` condition, which
# `set -e` does not act on, so a failing audit cannot end a `set -e` caller's
# shell before the cleanup below runs and leave the worktree registered.
audit_dir="$(mktemp -d)/nl-audit"
if git fetch origin +refs/heads/release:refs/remotes/origin/release \
  && git worktree add "$audit_dir" origin/release \
  && ( cd "$audit_dir" && pnpm install --frozen-lockfile \
       && NEUROLINK_SCANNER_TIMEOUT_MS=300000 pnpm exec tsx scripts/security-check.ts ); then
  audit_status=0
else
  audit_status=$?
fi
# Guarded: if the fetch or the `worktree add` failed, there is nothing to
# remove, and an unguarded remove prints `fatal: ... is not a working tree`
# on exactly the failure path this section exists to de-confuse.
[ -d "$audit_dir" ] && git worktree remove --force "$audit_dir"
rm -rf "$(dirname "$audit_dir")"
# Cleanup runs unconditionally, so the block's own exit status would otherwise
# be the `rm`'s — 0 — and a caller that wraps this diagnostic in a script reads
# a red gate as a pass, which is the exact misreading this section exists to
# prevent. Restore the audit's status. `( exit N )` and not a bare
# `exit "$audit_status"`: the latter closes the interactive shell you pasted
# this into, while the subshell form still leaves `$?` correct for a script.
( exit "$audit_status" )
```

Note `origin/release`, not `release`: the check reports how far behind
`origin/release` you are, so auditing a stale local ref reproduces a tree CI
never ran and sends you chasing a difference that is your own checkout. The
throwaway worktree keeps it read-only — `git stash && git checkout` mutates
the tree you are debugging, which is a poor trade for a diagnostic whose
whole question is "was it already broken without me?" And `--frozen-lockfile`
because that is how every CI job installs: a plain `pnpm install` may
re-resolve a transitive range and hand you a tree CI never audited, which is
the same class of mistake this whole section is about.

The timeout is CI's (`ci.yml` sets `NEUROLINK_SCANNER_TIMEOUT_MS` to 300000);
the script's own default is 120 seconds, so without it a slow audit can fail
here that CI would have let finish.

If it fails there too with advisories, the fix belongs in its own dependency
PR, not in whatever you were working on. A failure that names no advisory (the
audit timed out, was killed, or produced no output: `security-check.ts` fails
closed on each) is about the scanner, not a dependency; run it again before
concluding anything.

**Fixing it: raise the floor, and move the override band with it.** Prefer
bumping the declared range over adding an accepted-risk entry — an accepted
risk silences the gate for everyone, while a floor bump is what actually
protects downstream consumers, who resolve from `package.json` and never see
our lockfile. Two things are easy to get wrong:

- **A lockfile-only bump is not a fix.** It greens CI and leaves every
  installer of the published package on the vulnerable version.
- **A raised floor with a stale `pnpm.overrides` band is worse than no
  override.** The entries lift transitive consumers to a version that was
  patched for an _older_ advisory, which can sit inside the _new_ one's
  vulnerable range.

  The worked example is historical, and deliberately so — the repository has
  since been fixed, so do not expect `package.json` to still show the broken
  state. `GHSA-2883-xcg3-v3hh` covers `>=3.0.0 <3.15.2` **and**
  `>=4.0.0 <4.3.2`; the js-yaml overrides then read `>=3.14.2` / `>=4.1.1`,
  which are the fixes for an _earlier_ js-yaml advisory and sit **inside**
  both of this one's bands. They now read `>=3.15.2` / `>=4.3.2`, on the band
  edges, which is what correct looks like. The trap is the shape, not those
  numbers: an override target that was patched for the advisory you fixed
  last time.

  A lockfile that happens to resolve a safe version hides this, so CI stays
  green and the pin re-manifests on the next install that re-resolves a
  transitive range. Note also that `pnpm audit` printed only the 4.x range —
  the 3.x half was invisible. Check every range on the GHSA record, not just
  the one the audit showed you:

  ```bash
  gh api graphql -f query='{securityVulnerabilities(first:10, ecosystem:NPM,
    package:"<pkg>"){nodes{advisory{ghsaId} vulnerableVersionRange
    firstPatchedVersion{identifier}}}}'
  ```

  `fast-xml-parser`, `undici` and now `js-yaml` in the same table are the
  worked examples of a band kept in step with its floor.

## ⚠️ ffmpeg is deliberately not installed in CI

Nothing CI runs needs the system `ffmpeg` executable. No package script invokes
it and no CI step installs it (the root install may still pull the optional
`ffmpeg-static` and `fluent-ffmpeg` packages, which CI never calls), and `src/`
shells out to ffmpeg only at **runtime** (frame
extraction, video merging, audio playback) — never during install, lint,
typecheck, build or pack, which is all the CI jobs do. `provider-safety-net` has
always built the package and run its suites without it.

It was removed after breaking CI four ways in a single day: a corrupt published
asset, a version pin that stopped resolving, a step deadline too tight for a
slow mirror, and an Ubuntu mirror returning `Ign:` for every index while apt sat
for fourteen minutes. Because `build-check` is a required check, each of those
blocked **every open pull request** on a dependency none of the jobs use.

If a job ever genuinely exercises media, install ffmpeg **in that job only**, and
bound every wait — `DPkg::Lock::Timeout`, `Acquire::http::Timeout`,
`Acquire::https::Timeout` — plus a step `timeout-minutes`. An unbounded `apt-get`
waits forever on the dpkg lock that `unattended-upgrades` holds.
