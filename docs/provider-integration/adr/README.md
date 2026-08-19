# Architecture Decision Records — Provider Onboarding Redesign

Short, dated records of the load-bearing decisions behind the provider
onboarding redesign (Plans 04–10, August 2026). Read these before arguing to
change the shape of `ProviderDescriptor`, the catalog, or the CI gate — the
tradeoffs were already litigated once.

| ADR  | Decision                                                                       | Status               |
| ---- | ------------------------------------------------------------------------------ | -------------------- |
| 0001 | `ProviderDescriptor` is the single source of truth for provider identity       | Accepted             |
| 0002 | OpenAI-wire-compatible providers default to a data-catalog row, not a subclass | Accepted and shipped |
| 0003 | Mocked-fetch contract tests are the CI gate; live-API suites are not           | Accepted and shipped |
