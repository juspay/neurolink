# Agent cost estimates

`Agent.execute(input, { enableAnalytics: true })` returns the SDK's estimate in
`AgentResult.cost`, in USD. The matching `Agent.stream` option puts the estimate
on its completion chunk. An unpriced model has `undefined` cost, including in
ordinary SDK analytics and cost telemetry; no other model's provider default is
used. This is an API estimate, not an invoice or the merchant's actual payment.

`maxBudgetUsd` is forwarded to the underlying NeuroLink instance. It measures
cumulative instance spend across calls and is checked before a later request;
it cannot limit one run or retract money already spent by an earlier call.
Leaving it unspecified adds no budget enforcement.

The recorded Vertex `claude-sonnet-4@20250514` identifier and the GA
`gemini-3.1-flash-lite` identifier have named pricing entries. The standard token
rates come from [Claude pricing](https://platform.claude.com/docs/en/about-claude/pricing)
and [Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing), checked on
4 October 2026. The Gemini entry covers text/image/video tokens; distinct audio,
grounding, storage and other separately billed charges are not inferred from
an aggregate token count.

The legacy public `calculateCost` numeric helper still returns zero when it has
no matching rates. A caller using that helper must check `hasPricing` first;
agent and SDK analytics perform that check and preserve an unknown estimate.
