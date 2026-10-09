# NAVER CLOVA Studio source pilot

This source entry uses the OpenAI-compatible chat route at
`https://clovastudio.stream.ntruss.com/v1/openai/chat/completions`, a CLOVA
Studio-issued Bearer API key, and the documented `HCX-005` model. No actual
account, key, model roster, inference or payment operation was performed.

The vendor [Chat Completions v3 reference](https://api.ncloud-docs.com/docs/en/clovastudio-chatcompletionsv3)
states that HCX-005 input and output together cannot exceed 128,000 tokens and
that requested output cannot exceed 4,096 tokens. The
[OpenAI-compatible guide](https://api.ncloud-docs.com/docs/en/clovastudio-openaicompatibility)
uses that same exact model ID. These are explicit per-model constraints, not
conversion of an approximate context label.

The [CLOVA Studio prerequisites](https://guide.ncloud-docs.com/docs/en/clovastudio-spec)
state that model, purpose and token usage incur fees. The official
[new-signup credit policy](https://www.ncloud.com/main/creditEvent), retrieved on
October 9, 2026, offers **100,000 KRW** of conditional discount credit after
payment-method registration and an application. Issued credit lasts **three
months**. Eligibility follows the policy at application time; recipients of
other discounts cannot apply. Free/trial products, Marketplace purchases and
NAVER WORKS are excluded.

The bounded `promotional-credit` billing value records that offer without
reclassifying it as a free tier or a card-only requirement. It preserves all
three existing billing values. It does not prove that a current account is
eligible, subscribed, funded, or able to call the API. Numeric model pricing is
omitted rather than inventing a KRW-to-USD conversion.

The shim supports tool choice `auto`, `none` and a named tool object, but not
`required`. The public SDK can express `required`, so the provider-scoped
`rejectRequiredToolChoice` guard rejects that intent on a nonempty-tools
request before sending. It preserves the accepted choices and leaves other
providers unchanged. It never changes `required` into `auto`.

`parallel_tool_calls: false` is a documented endpoint limitation, but no
ordinary SDK generate/stream input channel for it was established; this change
adds no unreachable parameter DSL. The shim ignores JSON-schema `name` and
`strict`, so this initial entry does not advertise native strict-schema or
unproved tools-plus-schema support. Other models, native v3 payloads/events,
embeddings, images, and SDK effort controls remain outside this pilot.

The dedicated public contract covers SDK and built CLI defaults and routes,
unique user prompts and backend answers, effective stream modes, exact output
budgets, invalid-model rejection, tool nonce round trips for accepted choices,
and intentional rejection of `required`. A paired existing-provider control
must still honor `required`. These are owned-endpoint proofs, not vendor live
availability.

`DOCS_ONLY_ROSTER_NOT_OBSERVED` labels the legacy required evidence field as
source documentation only. `addedInPR` names the introduction PR
(https://github.com/juspay/neurolink/pull/1966); it is not proof of merge. Source, contract, installed package, actual account/live and
review/delivery states stay separate. Generated regions and heavy validation
remain coordinator-owned after this source handoff.
