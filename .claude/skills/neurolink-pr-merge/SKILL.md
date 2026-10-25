---
name: neurolink-pr-merge
description: "Use when merging or rebasing NeuroLink pull requests, especially stacked PRs, or when reading CI and status-check results: why --delete-branch can close a child PR, rebasing each child after a rebase-merge, the stash-list race across worktrees, and the ways this repo has misread a CI rollup."
---

# Merging stacks and reading CI results

Moved out of the root CLAUDE.md. The required-status-checks table and the `reset --soft` incident stay in the root CLAUDE.md because CI files cite them by name. The generator, docs-site and advisory-gate playbooks are in the `neurolink-ci-maintenance` skill.

## Stacked pull requests, and why they used to be unmergeable

A **stacked** pull request is one whose base is another feature branch rather
than `release`, opened so dependent work can proceed before its parent merges.
They work now. They did not before, and the reason is worth keeping because it
is invisible in exactly the way this repository keeps getting caught by.

Four of the five required status contexts — `test`, `provider-safety-net`,
`security-suites`, `build-check` — are **jobs inside `ci.yml`**. The fifth,
`🔒 Single Commit Policy Validation`, comes from a separate workflow,
`single-commit-enforcement.yml`. So a base-branch filter on `ci.yml`'s
`pull_request` trigger does not decide whether those four checks pass. It
decides whether they are **created at all**. Scoped to `branches: [release]`, a
stacked PR got none of those four, and a check that was never created reports as
_missing_, not as failing — which on a pull request is indistinguishable from
"still queued". PR #1670 sat at **1 of 5** required contexts from the day it was
opened, with nothing red to explain why.

`single-commit-enforcement.yml` broke them a second, independent way. Its
`pull_request` trigger was scoped to `[release, main]`, so a stacked PR fell
through to the **push-event** path, which hardcoded `BASE_BRANCH="origin/release"`.
Counting commits from `release` on a branch stacked on another feature branch
includes the parent's commit, so a single-commit PR was reported as carrying two
and failed a policy it had not broken.

Both `pull_request` triggers are now unfiltered by base branch. The
pull-request path already resolved the real base from `github.base_ref`; it was
simply never reached. The push path now asks for the branch's open PR and uses
its base, falling back to `release` when there is none.

Two things to know when stacking:

- **`push` in `ci.yml` is still scoped to `release`,** deliberately. Only
  pull-request handling was widened.
- **Merge the parent first, then rebase each child by hand.** GitHub usually
  moves the child's base to `release` when the parent merges (it did for #2001
  and #2010 when #2000 landed), but the child still needs the rebase below. Omit
  `--delete-branch` on a parent
  that still has an open child: deleting the base can **close** the child
  outright rather than retarget it, which is the `#1696` incident recorded in
  "⚠️ Merging a stack: `--delete-branch` closes the child" below. Rebase-merge
  also replays the parent's commit under a new SHA, so the child still carries
  the parent's old commit and fails the single-commit policy until it is
  rebased — see "rebase-merge rewrites the parent, so rebase each child" for
  the `git rebase --onto origin/release <parent-old-head>` recipe.

  The same applies to a parent that is merely **force-pushed while still
  open**, which is the more common case: rebasing a parent orphans the copy of
  its commit that each child carries, and every child flips to `CONFLICTING`
  the moment the parent is pushed. Rebasing #1668 and #1647 onto a moved
  `release` did exactly that to #1670 and #1648, each of which needed
  `git rebase --onto origin/<parent-branch> <parent-old-head>` before it was
  mergeable again. Expect to fix up the whole stack, bottom-up, after touching
  any link in it. A force-push does re-trigger stale bot reviews on the child,
  but that is a cost of the rebase, not a reason to skip it.

## ⚠️ Reading a CI result: seven ways this repo has misread one

Every incident below produced a confident wrong answer. Incidents 1, 2 and 4
are the same mistake — treating the _absence_ of a signal as a signal — and 3 is
its inverse, a surplus read as a miscount. The last three are its close
relatives: reading a signal the tool never emitted, getting the same wrong
answer twice from two passes that shared an input, and reading a signal that
belongs to a commit you have already replaced. They are recorded together
because each one cost real time before it was spotted.

**1. `CANCELLED` is not a failure.** Superseded runs report `CANCELLED`, and this
workflow cancels its own in-progress runs (`concurrency.cancel-in-progress`), so
an amend-and-force-push routinely leaves cancelled runs behind. A check written
as `conclusion != "SUCCESS"` therefore alarms on healthy history: three runs
fired for one SHA in 28 seconds on #1552 and the first was cancelled by the
second. Classify `CANCELLED` as _no result_, never as red.

**2. A check that has not appeared has not passed.** `pending == 0` is true both
when every check finished and when none has been created yet. GitHub takes a
while to register a workflow's check runs, and a pull request polled inside that
window looks green with a handful of unrelated checks while four of the five
required contexts are simply missing. Gate on the required contexts being
**present** before reading their state:

```bash
gh pr view <N> --json statusCheckRollup --jq \
  '[.statusCheckRollup[] | select((.name//.context) | IN(
     "test","provider-safety-net","build-check",
     "🔒 Single Commit Policy Validation","security-suites"))
   | (.name//.context)] | unique | length'   # must be 5 before the result means anything
```

**3. Count required checks as distinct contexts.** `🔒 Single Commit Policy
Validation` reliably appears **twice** in `statusCheckRollup`, so a naive count
reports six-of-five and a comparison written as `== 5` fails on a green pull
request. Deduplicate by name, as above.

**4. `gh pr checks <N> --json name,state` returns empty in some
environments.** It exits
successfully and prints nothing, which reads as "no failures". Use
`gh pr view <N> --json statusCheckRollup` instead — the failure mode of the
wrong command here is silence, not an error.

**5. An exit code from the shell is not a result from the tool.** The four
above are all "the tool ran and the signal was misread". This one is worse:
the tool never ran. A gate invoked as `pnpm run check > "$out"` where `$out`
is a directory fails in the redirect, before the command starts, and reports
exit 1 — indistinguishable at a glance from a real failure, while the output
file is empty in exactly the way a clean run also leaves it. It was hit twice
in one day, and in both directions: once read as a broken build, once as a
clean one. Check that the output actually contains the tool's own output
before believing either verdict, and prefer a path you created over one you
assumed was a file.

**6. A verifier that shares an input with the claim it checks is not
adversarial about that input.** An adversarial review pass exists to refute a
finding, but it can only do that on evidence the finding did not supply. Two
reviewers in this repo both read `pull/<N>/head` from a shared clone while
other agents were fetching different pull requests into it, so `FETCH_HEAD`
had moved: the first produced a finding that was already false at the head it
was told to read, and the second "confirmed" it from the same stale object.
The result was a confident, verified, wrong finding reported to another
author. Pin to the sha — `gh api repos/<owner>/<repo>/pulls/<N> --jq
.head.sha` — at **both** stages, and treat any check that reuses the input,
tooling or assumption under test as unverified. This is the same failure as
the probe below, one level up: agreement between two passes is not evidence
when they share the thing that is wrong.

The same rule generalises past CI, and is worth applying to any probe: **an
assertion about something NOT happening needs a precondition proving the thing
under test actually ran.** A probe once reported `LEAK: socket still open` for a
Bedrock request, on a run where the request never left the machine —
`closedAt === null` meant "nothing happened", not "still open". Three successive
probe designs agreed with each other and were all wrong for the same reason,
because they shared an unstated assumption about the transport. Assert the
precondition first, in the probe, and make it fail loudly when it does not hold.

**7. A pull request's check rollup can describe the PREVIOUS head.** Incident 2
above is the one about a check that has not appeared yet — 1, 3 and 4 are a
cancelled run, a duplicated context and a command that printed nothing. This is
incident 2's mirror image: a check that appeared, passed, and belongs to a commit
you have just replaced.
Immediately after an amend-and-force-push, `gh pr view <N> --json
statusCheckRollup` can still serve the outgoing head's runs — so the gate reads
a clean `5/5 SUCCESS` for a SHA that no longer exists on the branch, seconds
after a push that has not started a single job. It was hit while merging a
rebased stack: the rollup said five green, and `commits/<new-sha>/check-runs`
said three present and all `in_progress`.

Ask the commit, not the pull request:

```bash
SHA=$(gh api repos/juspay/neurolink/pulls/<N> --jq .head.sha)
gh api "repos/juspay/neurolink/commits/$SHA/check-runs?per_page=100"
```

and re-read `.head.sha` on every poll, so a gate aborts rather than reports
when the head moves underneath it. `mergeable_state` is not a substitute —
it read `unknown` through the whole window. This is incident 6 again in a
different costume: the stale object was a check run rather than a `FETCH_HEAD`,
and a rollup that is merely _late_ is indistinguishable from one that is
_right_ unless you pin the sha yourself.

## ⚠️ Merging a stack: `--delete-branch` closes the child

The house recipe is `gh pr merge <n> --rebase --delete-branch`, and on a
pull request that targets `release` it is correct. On a **stacked** pull request
— one whose base is another open PR's branch — the `--delete-branch` half is
actively destructive. GitHub usually retargets a child onto the merged PR's
base: merging #2000 without `--delete-branch` moved #2001 and #2010 to `release`
at once, with #2000's branch still in place. It did not for #1696, whose base
was deleted in the same `gh pr merge --delete-branch`: GitHub **closed** the
child instead, because the branch it was opened against no longer existed.

That happened to #1696 when #1649 landed. The child's own branch was untouched,
so no work was lost, but the pull request went to `state=closed, merged=false`
and could not be reopened — `PATCH /pulls/1696 -f state=open` returns

```
state cannot be changed. The fix/campaign-followups-closeout branch has been deleted.
```

Recovery is to recreate the base branch at the SHA it had before the merge,
reopen the child, retarget it to `release`, and only then delete the temporary
ref:

```bash
# The base ref is already deleted, and deleting a ref deletes its reflog with
# it, so the pre-merge tip cannot come from git. The merged parent PR keeps it:
# its head SHA is the branch tip at the moment it was merged.
# Each step runs only if the one before it succeeded, so a failed ref creation
# never leaves the child reopened against a branch that does not exist.
deleted_base=<deleted-base>
pre_merge_sha=$(gh pr view <parent> -R juspay/neurolink --json headRefOid --jq .headRefOid) &&
  test -n "$pre_merge_sha" &&
  gh api -X POST repos/juspay/neurolink/git/refs \
    -f ref="refs/heads/$deleted_base" \
    -f sha="$pre_merge_sha" &&
  gh api -X PATCH repos/juspay/neurolink/pulls/<child> -f state=open &&
  gh api -X PATCH repos/juspay/neurolink/pulls/<child> -f base=release ||
  { echo "recovery stopped at the step that failed above" >&2; false; }
```

On #1696 the approvals and review threads survived that round trip, but a
base change can mark review comments outdated and, with stale-review dismissal
on, dismiss approvals: re-check the review state afterwards. Before deleting the
recreated ref, confirm its content really landed — after a rebase-merge the SHA
differs, so `git merge-base --is-ancestor` reports NOT_MERGED on a branch that
is fully merged. Trees do not settle it either: the merge commit sits on a
newer `release`, so its tree differs whenever `release` moved. Compare the
change, against fresh refs (first
`git fetch origin +refs/heads/release:refs/remotes/origin/release +refs/heads/<branch>:refs/remotes/origin/<branch>`:
the API calls above create the branch on GitHub only, and explicit destinations
update both tracking refs even in a clone whose `remote.origin.fetch` does not
map them):
`git cherry origin/release origin/<branch>` marks each commit of the branch
`-` when an equivalent patch is already on `release` and `+` when it is not, and
every line must read `-`.

**So: omit `--delete-branch` for any PR that still has an open child**, and let
it run only on the last link. The repository's own auto-delete-on-merge handles
the rest.

## ⚠️ Merging a stack: rebase-merge rewrites the parent, so rebase each child

**Rebase and merge** replays the parent's commit onto `release` under a _new_
SHA. The child's branch still carries the parent's _old_ commit, which is now on
no branch — so the moment the child is retargeted to `release` it reports **two
commits** and fails `🔒 Single Commit Policy Validation`, a policy it has not
broken.

Rebase each child onto the new tip between merges. Use `--onto` with the
parent's old head, which replays only the child's own commit and never asks
about the parent's:

```bash
git fetch origin release
git switch <child>
git rebase --onto origin/release <parent-old-head>
```

`git switch` first is not optional: `--onto` replays whatever is on `HEAD`, and
between merges the operator is often standing on a sibling link of the stack.
Without it the command silently rebases the wrong branch.

A plain `git rebase origin/release` skips a commit whose patch is already on
`release`, but the child's copy of the parent is usually an older revision of
it: the parent was amended, rebased or regenerated before it merged, so the two
patches differ, and the plain rebase replays the old one and conflicts. `--onto`
avoids the `--skip` dance entirely.

Expect `docs-site/static/search-index.json` to conflict on every link of a
stack: it is generated, committed, and touched by almost everything. Resolve it
by regenerating rather than by picking a side — `pnpm run build`, `pnpm run
docs:api`, then `pnpm --dir docs-site run build` — and fold the result into the
single commit. See the reproducible-generator section of the
`neurolink-ci-maintenance` skill for why a second
build must produce zero drift.

## ⚠️ The stash list is shared by every worktree, so `stash@{0}` is a race

`git stash` writes to the **shared** `.git` directory. The stash list is
therefore common to every worktree of a repository, not per-worktree — which
makes every index-based reference (`stash@{0}`, `stash@{1}`) a race against
whatever else is running.

This is not hypothetical. With nine agents working in parallel across separate
worktrees of this repository, one pushed a stash, another pushed one before the
first popped, and the first agent's `git stash pop` applied **someone else's**
five files into its worktree and dropped that entry from the list. The victim
was mid-change on an unrelated branch.

It recovered only because a stash commit is an ordinary immutable commit: the
SHA was still reachable, so `git stash store -m "<original message>" <sha>`
put it back with its content intact. Had the SHA not been captured, the entry
would have been unreferenced and the work gone at the next `gc`.

What makes it dangerous is that nothing looks wrong at the time. `git stash
pop` succeeds, reports files restored, and exits 0. The applying worktree gets
extra modified files that may look like its own half-finished work, and the
owning worktree's stash simply is not in the list any more.

So, whenever more than one worktree is in play:

- **Never address a stash by index.** And do not capture the SHA as a second
  command either — `git stash push` followed by `git rev-parse "stash@{0}"`
  is the same race in miniature: another worktree's `stash push` can land in
  the gap between the two, and `stash@{0}` then resolves to _that_ stash, not
  yours. Capture it atomically instead: `git stash create` builds the stash
  commit and prints its SHA on its own, without reading or writing the shared
  stash list, so there is no gap for another worktree to land in —
  `sha=$(git stash create)` — then register it under that known SHA with
  `git stash store -m "<message>" "$sha"`, and clear the working tree with
  `git reset --hard` only once both have succeeded:
  `sha=$(git stash create) && test -n "$sha" && git stash store -m "<message>" "$sha" && git reset --hard`.
  (`git stash create` prints nothing for a clean tree, and a failed `store`
  would leave the work only in a dangling commit. It does not capture untracked
  files either, and `git reset --hard` overwrites an untracked file at a path
  `HEAD` tracks, such as one recreated after `git rm`; check `git status` for
  that first.) Apply it by that SHA (`git stash apply "$sha"`). `git stash
drop` takes only a stash reference, and looking one up from the SHA and then
  dropping it are two steps another worktree can stash between. So drop it only
  after `git stash apply` succeeded without conflicts and the restored changes
  are checked, and only when no other worktree is stashing, with the lookup
  immediately before:
  `ref=$(git stash list --format='%gd %H' | awk -v s="$sha" '$2 == s { print $1 }') && test -n "$ref" && git stash drop "$ref"`;
  otherwise, and always after a conflicted or doubtful apply, leave the entry: it
  is the backup, and a stored stash costs nothing.
  A SHA identifies one specific stash; an index identifies whatever happens to
  be on top when you get there.
- **Prefer not stashing at all.** Reading one file's other version is what
  `git show <sha>:<path>` is for, and a scratch copy outside the repository
  costs nothing. Neither touches shared state.
- Note the same sharing applies to other `.git`-level state — refs, the reflog,
  `gc` — so a worktree is not the isolation boundary it looks like.
