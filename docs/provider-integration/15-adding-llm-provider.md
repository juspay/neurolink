# 15 · Adding a New LLM Provider — superseded by the tiered guide

> **This document is a redirect, not the current guide.** The exhaustive
> file checklist this file used to describe predates the
> provider-descriptor and OpenAI-compat-catalog redesign (August 2026) and
> no longer matches the codebase. Use
> `tiers/README.md` instead — it routes you to
> the right tier (1–4) and each tier doc has the current, accurate file
> list.

## Quick links

- `tiers/README.md` — start here; decision tree
- `tiers/tier-1-aggregator-passthrough.md` — zero code
- `tiers/tier-2-catalog-entry.md` — ~1 hour, one data row
- `tiers/tier-3-adapter-native.md` — days, one provider class
- `tiers/tier-4-full-custom.md` — bespoke, needs written justification
- `adr/0001-provider-descriptor-as-source-of-truth.md` — why the shape changed

The implementation journals this guide used to generalize from
(`00-architecture.md`, `02-deepseek.md` through `05-llamacpp.md`) are
still useful as worked historical examples of the _pre-redesign_ shape —
read them for BaseProvider/streaming fundamentals, not for the current
file checklist.
