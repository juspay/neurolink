# Catalog authoring and admission

Catalog source completeness, PR provenance, installed-package behavior and
current vendor availability are separate results. The default
`pnpm run verify:provider-onboarding` remains an offline source check; it does
not certify the PR URL or refresh a dated roster/live record.

Catalog **model defaults** for context and output must be positive safe
integers supported by source evidence. Unknown ceilings remain unresolved.
This authoring constraint does not alter caller `maxTokens: 0` semantics or
optional per-model overrides. A scaffold intentionally contains invalid zero
ceilings and TODO evidence until the author supplies real values.

Inspect an unfinished scaffold:

```sh
pnpm exec tsx tools/verify-provider-onboarding.ts --catalog-stage draft --catalog-file provider.json
```

This reports `incomplete_draft` and its validation problems. Successful draft
inspection is not admission; every admission result has zero provider-count,
package, publication, roster and live credit.

After filling the source fields, use the exact `PENDING_PR` marker while no PR
exists. A guessed URL or arbitrary string is not provenance:

```sh
pnpm exec tsx tools/verify-provider-onboarding.ts --catalog-stage source --provider vendor-id
```

Without a provider/file selector, draft/source stages inspect the whole
catalog. They stay offline. A canonical PR URL is only syntax at this stage;
the output explicitly leaves provenance unverified. Existing dated evidence
is retained without relabeling or requiring a breaking record migration.
Paired (`--catalog-stage source`) and equals (`--catalog-stage=source`) options
can be mixed; the same forms apply to provider, file and source-head selectors.

When a real introduction PR exists, put its actual URL in `addedInPR`,
regenerate and commit the source, then inspect the immutable PR head:

```sh
pnpm exec tsx tools/verify-provider-onboarding.ts --catalog-stage review --provider vendor-id --source-head FULL_LOCAL_HEAD_SHA
```

The explicitly selected provenance stage uses authenticated, read-only `gh api`
queries. It requires the actual repository/PR identity, an added-file association
for this provider, the exact local source/PR head and equal provider-file blob.
Uncommitted source, a stale/unrelated head, guessed/nonexistent PR or unrelated
existing PR fails. GitHub API access failures fail closed. Association proof
does not certify reviewer approval or current candidate CI.

After merge:

```sh
pnpm exec tsx tools/verify-provider-onboarding.ts --catalog-stage merged --provider vendor-id --source-head FULL_LOCAL_HEAD_SHA
```

This reports `historical_catalog_file_introduction_verified`: actual added-file
association, merged state, merge ancestry in the selected local head and all
five required checks completed `SUCCESS` at the introduction PR head. It does
not certify current product identity or content continuity after later edits,
deletion or replacement. Historical file introduction remains provable even if
a later product reuses that path; the current source bytes are not silently
equated with the old introduced blob. Current integration/product acceptance
needs its separate evidence. The newest run of each required check must pass;
missing, skipped, neutral or pending runs fail.

`roster`, `live`, `package` and `release` are deliberately not admission-command
stages. Docs-only records cannot become authenticated roster or live receipts.
Those claims require their separately authorized current account/model/route
execution or installed-consumer evidence. This command makes no vendor calls
and never changes an account, PR, branch, catalog record or remote thread.
