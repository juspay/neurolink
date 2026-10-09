# Abliteration source pilot

This local provider draft covers `abliterated-model` through the documented
OpenAI chat route, `https://api.abliteration.ai/v1/chat/completions`, with Bearer
authentication. It has no live availability or delivery credit.

The vendor's [model Limits table](https://docs.abliteration.ai/models) explicitly
binds this model to 262,144 context tokens and a maximum completion of 262,134
tokens. Context is the combined input and output budget; the maximum output is
reachable only with a small prompt. These integers come from that table, rather
than expansion of the page's approximate "256K" heading.

The [quickstart](https://docs.abliteration.ai/quickstart),
[compatibility matrix](https://docs.abliteration.ai/compatibility-matrix), and
[streaming guide](https://docs.abliteration.ai/capabilities/streaming) describe
the standard request, SSE frames terminated by `[DONE]`, tool calls including
streamed arguments, and native JSON/schema response formats. The initial entry
does not opt into the native tool-plus-schema combination, which still needs a
specific vendor probe.

The [pricing page](https://abliteration.ai/pricing), retrieved on October 9,
2026, states a one-credit free preview without a payment card. The API uses a
prepaid USD balance. This is a documentation claim: account entitlement,
remaining balance, current model roster, and successful inference are untested.
The inherited queue's "no free tier" label is superseded by this dated receipt.

The service reasons by default. The entry does not advertise SDK effort/toggle
control. Large V2's effort remapping, other models, Responses, Anthropic
Messages, server-side web tools, and embeddings remain outside this pilot.

The dedicated regression drives the public SDK's `generate()` and `stream()`
and both built CLI commands against an owned HTTP endpoint. Each positive case
omits an explicit model to prove the catalog default. It also checks the exact
route, synthetic Bearer credential, absence of empty tool fields, fully drained
stream output, and rejection of an invalid model with internal fallback
disabled. The same file can target an installed artifact with `--package-root`.

`DOCS_ONLY_ROSTER_NOT_OBSERVED` in the legacy required evidence field records
source documentation only. `addedInPR` names the introduction PR
(https://github.com/juspay/neurolink/pull/1966); a URL alone is not proof of merge.
Neither field satisfies authenticated roster, live, merge, or publication
acceptance. The source JSON and regression remain unverified until the
coordinator integrates generated regions and grants the build/test lane.
