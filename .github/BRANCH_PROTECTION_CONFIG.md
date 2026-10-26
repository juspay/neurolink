# Branch protection for `release`

What gates a merge to `release`, what the live configuration was found to be in
the 2026-10 security audit, and the exact ruleset a repository admin applies to
close the gap. `.github/settings.yml` carries the same configuration in the
settings-app schema; `.github/workflows/branch-protection-audit.yml` sweeps the
live state hourly and fails when a required context or the `pull_request` rule
is missing.

## Two layers, enforced as a union

GitHub enforces classic branch protection AND rulesets together. They differ in
who can bypass them, so the same requirement means different things on each:

| layer              | required status checks                                                             | pull request / review                              | who can bypass                                      |
| ------------------ | ---------------------------------------------------------------------------------- | -------------------------------------------------- | --------------------------------------------------- |
| ruleset `11413189` | `test`, `provider-safety-net`, `build-check`, `🔒 Single Commit Policy Validation` | **none today** (no `pull_request` rule)            | nobody (`bypass_actors: []`)                        |
| classic protection | the same four + `security-suites`                                                  | not readable with a pull-only token; may be absent | repository admins (`enforcement_level: non_admins`) |

Consequences of the live state (verified 2026-10-26 with `gh api`):

- A commit can reach `release` without a reviewed pull request as far as the
  ruleset is concerned; only the classic layer could require one, and it does
  not bind admins.
- `security-suites` — the job that runs the archive, office-document and
  security-audit regression suites — is required only on the layer an admin can
  bypass, and a migration off classic protection would drop it silently (the
  job keeps running and keeps reporting green).
- `CODEOWNERS` referenced eight `@juspay/neurolink-*` teams that do not exist
  (33 validation errors from `codeowners/errors`), so "require review from code
  owners" could never route a review. The file has been removed; re-add one only
  with owners GitHub validates (`gh api repos/juspay/neurolink/codeowners/errors`
  must return zero errors).

## Target: ruleset `11413189`

Apply with a token that has repository administration rights (the audit token
had `pull` only, which is why none of this could be applied from the audit
branch). Read the current ruleset first and keep every rule it already has.

```bash
gh api repos/juspay/neurolink/rulesets/11413189 > ruleset.json   # back it up

gh api -X PUT repos/juspay/neurolink/rulesets/11413189 --input - <<'JSON'
{
  "name": "release",
  "target": "branch",
  "enforcement": "active",
  "bypass_actors": [],
  "conditions": { "ref_name": { "include": ["~DEFAULT_BRANCH"], "exclude": [] } },
  "rules": [
    { "type": "deletion" },
    { "type": "non_fast_forward" },
    { "type": "required_linear_history" },
    {
      "type": "pull_request",
      "parameters": {
        "required_approving_review_count": 1,
        "dismiss_stale_reviews_on_push": true,
        "require_last_push_approval": true,
        "required_review_thread_resolution": true,
        "require_code_owner_review": false
      }
    },
    {
      "type": "required_status_checks",
      "parameters": {
        "strict_required_status_checks_policy": false,
        "required_status_checks": [
          { "context": "test" },
          { "context": "provider-safety-net" },
          { "context": "build-check" },
          { "context": "🔒 Single Commit Policy Validation" },
          { "context": "security-suites" }
        ]
      }
    }
  ]
}
JSON
```

Then confirm, with the same call that under-reported the list before:

```bash
gh api repos/juspay/neurolink/rulesets/11413189 \
  --jq '.rules[] | .type, (.parameters.required_status_checks[]?.context // empty)'
gh api repos/juspay/neurolink/rules/branches/release \
  --jq '[.[] | select(.type == "pull_request")] | length'   # must be 1
```

Rules of the target, and why each one is there:

| rule                                         | setting            | why                                                                                                                 |
| -------------------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------- |
| `pull_request`                               | 1 approving review | the only control that makes a human read the change; the AI reviewer never approves (see below)                     |
| `dismiss_stale_reviews_on_push`              | true               | an approval is of a specific tree; a new push is a new tree                                                         |
| `require_last_push_approval`                 | true               | the person who pushed last cannot be the approver, so an author cannot approve their own final push                 |
| `required_review_thread_resolution`          | true               | a finding left open is a finding ignored; single-commit squashes make that easy to miss                             |
| `require_code_owner_review`                  | false              | no valid CODEOWNERS (above); `true` with no owners makes every PR unmergeable                                       |
| `required_status_checks` + `security-suites` | five contexts      | the fifth context moves onto the layer nobody can bypass                                                            |
| `strict_required_status_checks_policy`       | false (unchanged)  | requiring branches to be up to date would serialise every merge; the suites are not order-sensitive                 |
| `bypass_actors`                              | **empty**          | never add `github-actions[bot]`: `yama-learn.yml` used to ask for exactly that and now opens a pull request instead |
| `required_signatures`                        | not set — consider | every regular contributor would need signing configured first; add it as its own change                             |

## What the AI reviewer may do

"Yama PR Review" (`.github/workflows/yama-review.yml`) is **not** a required
check and must not become one, for two reasons: it skips on fork pull requests
(a required check that never reports blocks the PR forever), and it reads
untrusted pull-request text. It posts `COMMENTED` or `CHANGES_REQUESTED` reviews
only; the workflow dismisses and fails on any `APPROVED` review it produced, so a
prompt injection in a PR description cannot satisfy the one-approval rule above.

## Repository merge settings

Settings → General → Pull Requests (mirrors `.github/settings.yml`):

- Allow squash merging: on. Allow rebase merging: on. Allow merge commits: **off**.
- Automatically delete head branches: on (but see CLAUDE.md on stacked PRs —
  omit `--delete-branch` for a parent that still has an open child).

The single-commit policy is enforced by `🔒 Single Commit Policy Validation`
(`.github/workflows/single-commit-enforcement.yml`), documented in
`.github/SINGLE_COMMIT_POLICY.md`.

## Verification after applying

1. `branch-protection-audit.yml` goes green on its next hourly run (or
   `gh workflow run branch-protection-audit.yml`).
2. A direct push to `release` is refused with `GH013` naming the
   `pull_request` rule, not only the status checks.
3. A pull request with five green checks and no approval shows "Review
   required"; approving it as the author of the last push does not unblock it.

## Troubleshooting

- **"Required status check is not passing"** — the check name must match the
  job name exactly; the five names above are jobs in `ci.yml` and
  `single-commit-enforcement.yml`. CLAUDE.md's "Reading a CI result" section
  lists the ways a rollup misleads.
- **"Cannot push to protected branch"** — intended; everything lands through a
  pull request, including the release bot's own commits (which is why
  `@semantic-release/git` was removed).
- **`GH013 ... 4 of 4 required status checks are expected`** on a push — counts
  only the ruleset's checks; the classic layer's fifth is enforced too.
