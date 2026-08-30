---
name: repo-conventions
description: NeuroLink's review standards — the critical rules to enforce, what NOT to comment on, the security bar, hot paths. Load before reviewing any change in this repository.
---

# Reviewing a change in NeuroLink

Authoritative sources in this checkout (the repository root is `../`):

- `../CLAUDE.md` — the engineering rules, long form. When a finding violates one,
  cite the specific rule (e.g. "Critical Rule 1: dynamic imports only in the registry").
- `../CONTRIBUTING.md` — contribution and commit conventions.

This skill is the review-focused digest; those files win on any conflict.

## Do NOT comment on — CI already owns it

Formatting, lint and type errors — including CLAUDE.md rules 2 and 7–15 — are
enforced by ESLint + Prettier + tsc and the custom AST rules in `eslint-rules/`
(`interface` vs `type`, type file locations, barrel rules, double assertions,
e2e-only tests). Re-reporting mechanical violations buries the findings that
matter. Also skip: performance micro-costs, naming and prose taste, dependency
choice.

## The critical rules the review DOES enforce (cite the rule number)

- **Rule 1 — dynamic imports only in the registry.** Providers are imported
  dynamically inside factory functions in `providerRegistry.ts`; a static
  provider import is a circular-dependency bug.
- **Rule 3 — Gemini tools + JSON-schema structured output are mutually
  exclusive.** Gated on `isGeminiProvider` in `structuredOutputPolicy.ts`, NOT
  on Vertex as a whole (Vertex Claude supports both). Claude paths must default
  `max_tokens` via `resolveClaudeMaxTokens`, never a hardcoded 4096; truncation
  must surface (`jsonRepaired` / `jsonTruncated`), never silently.
- **Rule 4 — CLI ≠ SDK.** Manual MCP connections are CLI-only; CLI concerns
  must not leak into the SDK path.
- **Rule 5 — backward compatibility of the public SDK API.** Non-negotiable.
  Name the unmodified callers a change breaks; use the code graph to find them.
- **Rule 6 — `formatProviderError` returns the error, never throws.**
- **Rule 15 — tests are end-to-end only.** Suites drive `dist/index.js` or the
  built CLI (`node dist/cli/index.js`); ONE module graph per suite — mixing
  `src/` and `dist/` imports breaks stubs/spies/`instanceof` silently. A
  determinism exception must be declared in the file header and in the ESLint
  `allow` list.
- Provider `executeStream` goes through `BaseProvider.stream()` tool-merge.
- Factory + Registry is the extension pattern (providers, processors,
  chunkers, rerankers) — a new extensible thing that bypasses it is a finding.

## Security — the CRITICAL bar

Hardcoded secrets or credentials in source; secrets leaking into logs (confirm
`transformParamsForLogging` / secret stripping before logging provider params);
injection, unsafe eval/innerHTML/dynamic require, SSRF, path traversal; unsafe
handling of user or model input. Every CRITICAL claim must be anchored in the
change: quote the exact added line(s) from the diff. Placeholder values (docs,
tests, "sk-your-key-here", `${ENV_VAR}` references) are NOT leaked secrets — a
fabricated credential-leak report is worse than a missed real one.

## What the review spends itself on

Logic and correctness bugs, races, unhandled rejections; provider / MCP /
streaming / proxy-pool changes; missing error handling; backward compatibility
(rule 5); missing coverage in the matching `test/continuous-test-suite-*.ts`
for new behaviour.

## Out-of-diff impact — use the code graph when available

The diff alone does not show the damage a change does elsewhere. Orient once
(architecture overview, impact radius of the changed files, affected flows),
order the file-by-file pass by blast radius, and for each changed export check
its callers and dependents — signature, return shape, nullability, thrown
errors, async behaviour, side effects an UNMODIFIED caller does not handle.
Name the exact out-of-diff call sites. If the graph is unavailable, say impact
analysis was skipped — never fabricate impact claims.

## Hot paths — report at MAJOR or higher, and name the blast radius

| Path                                      | Why                                                 |
| ----------------------------------------- | --------------------------------------------------- |
| `src/lib/core/baseProvider.ts`            | Central `stream()` tool-merge every provider rides  |
| `src/lib/factories/providerRegistry.ts`   | Dynamic-import registry — the circular-dep tripwire |
| `src/lib/types/**`                        | The public surface rule 5 protects                  |
| `src/lib/server/routes/*ProxyRoutes.ts`   | Pool engines holding subscription credentials       |
| `src/lib/auth/**`                         | Token stores, OAuth refresh                         |
| `src/lib/mcp/**`                          | What tools an agent can reach                       |
| `src/lib/context/**`, `src/lib/memory/**` | Compaction/memory — silent data loss lives here     |

## Discipline

- Review file by file; skip lockfiles, generated or minified assets, `dist/`,
  `build/`, `coverage/`, images.
- Read code from THIS checkout — the platform is for the pull request's
  comments and metadata only.
- Conventional Commits with a required scope; ONE commit per pull request
  (squash-merged). Releases are generated from commit history.
