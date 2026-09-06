# Subpackage Dependency Advisories

`landing/` and `docs-site/` each keep their own independent `pnpm-lock.yaml`
(see `docs/development/package-overrides.md` for the root tree's own
override list). CI's `🔒 Subpackage Dependency Audit` step in
`.github/workflows/ci.yml` runs `pnpm audit --json` in both trees and parses
`metadata.vulnerabilities.critical` from the report — it blocks a merge only
when that count is non-zero, or when the report itself is unusable (a
registry outage or a broken `pnpm audit` produces no parseable JSON, which
fails the gate too, just for a different reason). It does not pass
`--audit-level=critical`, and no `pnpm audit --ignore` rule is honored unless
it is actually passed to that same command or configured for the audited
workspace. The high/moderate/low long tail is deliberately unaudited-by-gate
until triaged. This document is that triage.

**Read this as a snapshot, not a standing truth.** A dependency tree moves on
its own; the counts recorded in `ci.yml`'s own comment (measured 2026-08-29)
had already drifted by the time this document was built eight days later —
see [Measurement drift](#measurement-drift) below. Re-run the commands in
[Methodology](#methodology) before relying on any number here.

## Methodology

```bash
(cd landing   && pnpm audit --json)
(cd docs-site && pnpm audit --json)
```

No `--prod` flag — this matches the scope `ci.yml`'s audit step actually
uses. Adding `--prod` hides real findings (see
[Why "devDependency-only" isn't the same as "unreachable"](#why-devdependency-only-isnt-the-same-as-unreachable)),
it does not resolve them.

Measured: **2026-09-06**.

## Measurement drift

| Tree         | Severity | 2026-08-29 (`ci.yml` comment) | 2026-09-06 (this doc) |
| ------------ | -------- | ----------------------------: | --------------------: |
| `landing/`   | critical |                             0 |                     0 |
| `landing/`   | high     |                             6 |                     6 |
| `landing/`   | moderate |                             2 |                     3 |
| `landing/`   | low      |                             0 |                     0 |
| `docs-site/` | critical |                             0 |                     0 |
| `docs-site/` | high     |                            17 |                    22 |
| `docs-site/` | moderate |                            15 |                    19 |
| `docs-site/` | low      |                             3 |                     5 |

Zero new criticals — the gate's own promise held. But `docs-site/`'s high
count grew by 5 and moderate by 4 in eight days, purely from new advisories
being published against already-installed transitive versions (no dependency
bump happened on this branch in that window). That is the expected shape of
an unpinned long tail, not a regression to chase — see
[Recommendation](#recommendation) for what would actually move these numbers.

## Why "devDependency-only" isn't the same as "unreachable"

`ci.yml`'s comment already flags this trap once — repeating it here because
this document's own risk column depends on it. Two different questions get
conflated:

1. **Does `pnpm audit --prod` show this?** — i.e., is it a `dependencies`
   entry.
2. **Does the vulnerable code path ever run against untrusted input?**

These are not the same question. `landing/`'s `satori` (`fflate` transitively)
sits in `dependencies` and executes at request time on Vercel — question 1
says "risky", question 2 says "low, because the only inputs it parses are
fonts bundled in the repo, not attacker-supplied files." Conversely, several
of `docs-site/`'s `devDependencies`-rooted findings only run inside
`docusaurus start` (a local dev server never deployed) — question 1 would say
"safe" under `--prod`, but the **build toolchain** findings (webpack,
postcss, image-size, js-yaml via the MDX/bundler pipeline) do run during
`docusaurus build`, which today executes in CI against this repo's own
trusted content. The triage tables below answer question 2 per row, not
question 1 — that is why the tag column doesn't just mirror "is this a
`devDependency`."

## `landing/` — 6 high, 3 moderate, 0 low, 0 critical

<!-- prettier-ignore -->
| Severity | Module | GHSA | Dependency chain | Reachability | Triage |
| --- | --- | --- | --- | --- | --- |
| High | brace-expansion | [GHSA-3jxr-9vmj-r5cp](https://github.com/advisories/GHSA-3jxr-9vmj-r5cp), [GHSA-mh99-v99m-4gvg](https://github.com/advisories/GHSA-mh99-v99m-4gvg), [GHSA-rgw5-rvv9-x895](https://github.com/advisories/GHSA-rgw5-rvv9-x895) | `@sveltejs/adapter-vercel > @vercel/nft > glob > minimatch > brace-expansion` | Build-time only (`@vercel/nft` traces files during `vite build`'s Vercel adapter step; never runs against request input) | **Accept-risk.** `landing/package.json` already overrides `minimatch >=10.2.3` in this exact chain (commit `86b0a3265`, "add pnpm overrides for transitive security deps") — that override resolves to `minimatch@10.2.4`, which still pulls `brace-expansion@5.0.5`. A `brace-expansion >= 5.0.9` override would close all three, but `landing/package.json` is out of scope for this pass; tracked as **needs-upgrade** for the next `landing/package.json` touch. |
| High | nanoid | [GHSA-28wg-ghj8-5hjv](https://github.com/advisories/GHSA-28wg-ghj8-5hjv), [GHSA-2v37-7h3g-55p8](https://github.com/advisories/GHSA-2v37-7h3g-55p8) | `vite > postcss > nanoid` | Build-time only (`vite build` / `vite dev`, never in the served output) | **Accept-risk**, pending an upstream `postcss` bump that carries a newer `nanoid`. |
| High | postcss | [GHSA-r28c-9q8g-f849](https://github.com/advisories/GHSA-r28c-9q8g-f849) | `vite > postcss` | Build-time only | **Accept-risk**, same upstream (`vite`'s pinned `postcss`) as the moderate row below. |
| Moderate | brace-expansion | [GHSA-jxxr-4gwj-5jf2](https://github.com/advisories/GHSA-jxxr-4gwj-5jf2) | `@sveltejs/adapter-vercel > @vercel/nft > glob > minimatch > brace-expansion` | Build-time only | **Accept-risk** — same chain and same fix as the three high rows above; one override closes all four. |
| Moderate | postcss | [GHSA-fxqj-rqcc-2cmp](https://github.com/advisories/GHSA-fxqj-rqcc-2cmp) | `vite > postcss` | Build-time only | **Accept-risk**, pending `vite`'s own `postcss` bump. |
| Moderate | fflate | [GHSA-px8p-9vwx-vf98](https://github.com/advisories/GHSA-px8p-9vwx-vf98) | `satori > @shuding/opentype.js > fflate` | **Runtime** — `satori` is a production `dependencies` entry, used at request time (OG-image generation on Vercel). The vulnerable path only triggers on a malformed ZIP64 archive reaching `fflate`'s `unzipSync`, and `opentype.js` here only ever parses font files bundled in this repo, not attacker-supplied uploads — so the code path is live but the trigger is not attacker-reachable today. | **Needs-upgrade (low urgency).** Worth a `pnpm.overrides` entry (`fflate: ">=0.8.3"`) the next time `landing/package.json` is touched — it is the one finding in either tree that sits on an actual runtime request path, even though current exploitability is low. |

## `docs-site/` — 22 high, 19 moderate, 5 low, 0 critical

Every row below traces back through `@docusaurus/core`'s own build/dev
toolchain (webpack, postcss, babel, browserslist, image-size, js-yaml,
svgo, schema-utils/ajv) or through `webpack-dev-server` specifically
(`docusaurus start`, a local-only dev server, never deployed), with two
exceptions called out separately: the `posthog-js` telemetry chain and
`isomorphic-dompurify`, both of which ship in the client bundle the browser
actually loads.

### Build / dev-server toolchain — accept-risk

<!-- prettier-ignore -->
| Severity | Module | Findings | Chain root | Reachability |
| --- | --- | --- | --- | --- |
| High | brace-expansion | 3 GHSAs | `glob > minimatch > brace-expansion` | Build-time (`docusaurus build`) |
| High | browserslist | 2 GHSAs | `@docusaurus/types > webpack > browserslist` | Build-time |
| High | fast-uri | 6 GHSAs | `@docusaurus/types > webpack > schema-utils > ajv > fast-uri` | Build-time |
| High | image-size | 2 GHSAs | `@docusaurus/core > @docusaurus/mdx-loader > image-size` | Build-time (parses images embedded in this repo's own MDX, not user uploads) |
| High | js-yaml | 2 GHSAs (4 findings across 2 chains) | `@docusaurus/bundler > postcss-loader > cosmiconfig > js-yaml` and `gray-matter > js-yaml` | Build-time (parses this repo's own frontmatter/config, not untrusted YAML) |
| High | nanoid | 2 GHSAs | `@docusaurus/bundler > postcss > nanoid` | Build-time |
| High | postcss | 1 GHSA | `@docusaurus/bundler > postcss` | Build-time |
| High | shell-quote | 1 GHSA | `webpack-dev-server > launch-editor > shell-quote` | Dev-server only (`docusaurus start`) |
| High | svgo | 1 GHSA | `@docusaurus/cssnano-preset > … > postcss-svgo > svgo` | Build-time |
| Moderate | http-proxy-middleware | 1 GHSA | `webpack-dev-server > http-proxy-middleware` | Dev-server only |
| Moderate | js-yaml | 1 GHSA (2 findings) | same chains as above | Build-time |
| Moderate | launch-editor | 1 GHSA | `webpack-dev-server > launch-editor` | Dev-server only |
| Moderate | postcss | 1 GHSA | `@docusaurus/bundler > postcss` | Build-time |
| Moderate | qs | 2 GHSAs | `webpack-dev-server > express > qs` | Dev-server only |
| Moderate | uuid | 1 GHSA | `webpack-dev-server > sockjs > uuid` | Dev-server only |
| Moderate | webpack-dev-server | 3 GHSAs | `webpack-dev-server` itself | Dev-server only |
| Low | @babel/core | 1 GHSA | `@docusaurus/babel > @babel/core` | Build-time |
| Low | body-parser | 1 GHSA | `webpack-dev-server > express > body-parser` | Dev-server only |
| Low | postcss-selector-parser | 1 GHSA (2 findings) | `@docusaurus/bundler > … > postcss-selector-parser` | Build-time |

**Triage: accept-risk for all 19 module rows above (9 High, 7 Moderate, 3 Low).** None of these run
against anything but this repo's own trusted content and this repo's own
CI/local-dev machines — the dev-server rows don't even execute during a
production `docusaurus build`. They track upstream `@docusaurus/core`'s own
dependency graph; there is no override this repo can apply that
`@docusaurus/core`'s next release wouldn't just re-introduce differently.
Re-measure after any `@docusaurus/*` version bump — that is the only thing
that moves this bucket.

### Client-bundle dependencies — needs-review

<!-- prettier-ignore -->
| Severity | Module | GHSA | Chain | Why it's different | Triage |
| --- | --- | --- | --- | --- | --- |
| Moderate | @opentelemetry/core | [GHSA-8988-4f7v-96qf](https://github.com/advisories/GHSA-8988-4f7v-96qf) | `posthog-js > @opentelemetry/exporter-logs-otlp-http > @opentelemetry/core` (2 paths) | `posthog-js` ships in the browser bundle for analytics; this specific package is the OTLP log-export path, which sends telemetry out, it doesn't parse attacker-supplied baggage headers inbound. | **Accept-risk** — outbound-only code path; re-review if `posthog-js` is ever used to ingest, not just emit, telemetry. |
| Moderate | protobufjs | [GHSA-j3f2-48v5-ccww](https://github.com/advisories/GHSA-j3f2-48v5-ccww), [GHSA-jfj6-75fj-8934](https://github.com/advisories/GHSA-jfj6-75fj-8934) | `posthog-js > @opentelemetry/exporter-logs-otlp-http > @opentelemetry/otlp-transformer > protobufjs` | Same outbound-only OTLP export path as above. | **Accept-risk**, same reasoning. |
| Moderate | fflate | [GHSA-px8p-9vwx-vf98](https://github.com/advisories/GHSA-px8p-9vwx-vf98) | `posthog-js > fflate` | Ships in the client bundle; `posthog-js` uses it for its own asset compression, not for parsing user-supplied archives. | **Accept-risk**, low reachability. |
| Moderate | dompurify | [GHSA-55q2-fjhq-7xh7](https://github.com/advisories/GHSA-55q2-fjhq-7xh7), [GHSA-cmwh-pvxp-8882](https://github.com/advisories/GHSA-cmwh-pvxp-8882) | `isomorphic-dompurify > dompurify` | Sanitizes HTML that ends up rendered in the browser. Content sanitized here is this repo's own authored MDX/docs, not arbitrary visitor input — but a sanitizer bypass is exactly the class of bug that matters most if that assumption ever changes. | **Needs-upgrade.** A fixed `dompurify` is published (`>=3.4.13` / `>=3.4.11`); whatever pulls `isomorphic-dompurify` should get it bumped, or the dependency dropped if it renders nothing but static build-time content. |
| Low | dompurify | [GHSA-c2j3-45gr-mqc4](https://github.com/advisories/GHSA-c2j3-45gr-mqc4) | `isomorphic-dompurify > dompurify` | Same chain as above. | **Needs-upgrade**, same fix as the moderate `dompurify` rows. |

## Recommendation

- **No action required to keep the critical-only gate green** — it already
  is, in both trees, and stays that way regardless of anything in this
  document.
- **`landing/`**: the next time `landing/package.json` is edited, add
  `brace-expansion: ">=5.0.9"` and `fflate: ">=0.8.3"` to its existing
  `pnpm.overrides` block (it already carries five other overrides for the
  same class of transitive-vulnerability problem — `tar`, `devalue`,
  `rollup`, `minimatch`, `cookie`, `esbuild` — so this is precedent, not a
  new pattern). That closes all 4 `brace-expansion` findings and the one
  runtime-reachable finding in either tree.
- **`docs-site/`**: find and either upgrade or remove whatever pulls in
  `isomorphic-dompurify`; it is the only `docs-site/` finding with a
  reachable-in-the-browser exploit class (XSS) and an available fix.
  Everything else in `docs-site/` tracks `@docusaurus/core`'s own upstream
  releases — re-measure after the next Docusaurus bump rather than chasing
  individual transitive pins.
- **Raising `--audit-level` from `critical` to `high`** in `ci.yml` needs the
  two `needs-upgrade` items above resolved first (per `ci.yml`'s own
  comment); the accept-risk rows would still need an explicit
  `pnpm audit --ignore` (or equivalent) per advisory to avoid re-blocking on
  findings this document already reviewed. Not done as part of this pass —
  flagged here for whoever picks that decision up.

## Next review

Re-run the [Methodology](#methodology) commands: at minimum whenever
`landing/pnpm-lock.yaml` or `docs-site/pnpm-lock.yaml` changes, and
otherwise on the same quarterly cadence as `docs/development/package-overrides.md`.
