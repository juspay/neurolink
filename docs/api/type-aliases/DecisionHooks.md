[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DecisionHooks

# Type Alias: DecisionHooks

> **DecisionHooks** = `object`

Ride along on the decision calls NeuroLink already makes.

Latency on a decision model is flat in question count, so a host with its
own yes/no or choice questions about the same request pays nothing to ask
them in the round trip NeuroLink is making anyway — one request per
[DecisionSite](DecisionSite.md), never a second. The host's questions are namespaced
on the wire so they can never collide with NeuroLink's, capped so they can
never push the request past the provider's question limit (which would
refuse the whole call and degrade NeuroLink's own routing), and answered
back under the host's original ids.

Both hooks are fail-open: a hook that throws is logged and the decision
proceeds with NeuroLink's own questions, and neither can change what
NeuroLink does with its own answers — every value a hook or listener is
handed is a copy. Without hooks, the decision payload (state and
questions) is exactly what the consumer built; the outer request's
per-call `credentials` are still forwarded, so the account and base URL
on the wire can differ from the instance's. Hooks are inert without a
decision provider: neither runs, and no event fires.

## Properties

### extendQuestions?

> `optional` **extendQuestions?**: (`context`) => [`DecisionQuestionMap`](DecisionQuestionMap.md) \| `undefined` \| `Promise`\<[`DecisionQuestionMap`](DecisionQuestionMap.md) \| `undefined`\>

Return extra questions to send with this site's call, or `undefined` to
add none. An invalid question is dropped with a warning; questions past
the provider's cap are dropped from the end, also with a warning.

#### Parameters

##### context

[`DecisionHookContext`](DecisionHookContext.md)

#### Returns

[`DecisionQuestionMap`](DecisionQuestionMap.md) \| `undefined` \| `Promise`\<[`DecisionQuestionMap`](DecisionQuestionMap.md) \| `undefined`\>

---

### onAnswers?

> `optional` **onAnswers?**: (`context`) => `void` \| `Promise`\<`void`\>

Called with the host's answers (under the host's ids) and the full result
whenever a site call returns one. Observe-only: it receives a copy, so
mutating it cannot reach the answers NeuroLink's own consumer reads.

#### Parameters

##### context

[`DecisionHookAnswersContext`](DecisionHookAnswersContext.md)

#### Returns

`void` \| `Promise`\<`void`\>

---

### hookTimeoutMs?

> `optional` **hookTimeoutMs?**: `number`

Upper bound, in milliseconds, on each hook call. Both hooks sit on the
request path (routing, tool routing, compaction, RAG planning), so a
hook that hangs would stall the turn; past this bound the call proceeds
as if the hook had returned nothing, with a warning. Default 2000. Must
be a finite number from 1 to [MAX_DECISION_HOOK_TIMEOUT_MS](../variables/MAX_DECISION_HOOK_TIMEOUT_MS.md);
anything else (including `Infinity`) falls back to the default with one
warning, since a timer given such a delay fires immediately.
