[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / AgenticLoopAdapter

# Type Alias: AgenticLoopAdapter\<TConversation, TRaw\>

> **AgenticLoopAdapter**\<`TConversation`, `TRaw`\> = `object`

Defined in: [types/loopEngine.ts:105](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/loopEngine.ts#L105)

DESIGN DECISION — mid-turn tool-discovery hydration (Plan 08 blocker 2,
Task 7): resolved by the single optional `resolveToolOnMiss` field below,
NOT by a broader `dispatchTools?` full-dispatch override. A full-dispatch
override would let an adapter replace the engine's entire per-call
dispatch — breaker bookkeeping, execution, toolExecutions aggregation — so
every adapter needing hydration would have to reimplement that bookkeeping,
and any later engine-level fix to dispatch would silently not apply to the
adapters using the override. `resolveToolOnMiss` plugs into the existing
dispatch at the one decision point that needs a second lookup, leaving
breaker bookkeeping, retries and aggregation engine-owned for every
provider, hydrated or not.

DESIGN DECISION — originalNameMap propagation (blocker 3): needs ZERO
engine or type change. Google's function-name sanitization is a translation
concern between the wire (sanitized names out, sanitized names back on
tool_call.name) and the engine's shape, which only ever sees plain string
names. An adapter that needs the map threads it as a constructor-time
closure and translates inside its own `executeStep` /
`buildToolResultMessages`, before those names cross the engine boundary.

DESIGN DECISION — reserved-step + forced finalization (blocker 1, part 2):
stays OUTSIDE `runAgenticLoop`, in Vertex+Claude's own wrapper around
`resultPromise`. The reserved step needs no engine change at all — an
adapter declaring `maxSteps: requested - 1` means the engine's own loop
never touches the reserved slot. The forced call is a one-shot action taken
on the RESULT of a turn, not a repeatable step within one, so folding it in
would teach the engine a family-specific concept (forced tool_choice, a
distinguished terminal tool name) that every other adapter would then carry
and never set.

DESIGN DECISION — terminal tool-call marking (blocker 1, part 1): needs
ZERO engine or type change. An adapter treats a detected terminal call as
terminal by omitting it from `toolCalls` and putting its parsed payload in
`text`. The engine already ends a turn the moment a step yields zero tool
calls, so such a step is indistinguishable from an ordinary final text
turn: never looked up in `options.tools`, never reaching TOOL_NOT_FOUND,
never counted against the breaker. Proven by a case in the loop-engine
suite rather than asserted here.

## Type Parameters

### TConversation

`TConversation` = `unknown`

### TRaw

`TRaw` = `unknown`

## Properties

### providerLabel

> `readonly` **providerLabel**: `string`

Defined in: [types/loopEngine.ts:106](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/loopEngine.ts#L106)

---

### maxSteps

> `readonly` **maxSteps**: `number`

Defined in: [types/loopEngine.ts:107](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/loopEngine.ts#L107)

---

### defaultTurnTimeoutMs?

> `readonly` `optional` **defaultTurnTimeoutMs?**: `number`

Defined in: [types/loopEngine.ts:109](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/loopEngine.ts#L109)

Pre-existing per-family flat timeout, used as createTurnClock's deadline default.

---

### stallTimeoutMs?

> `readonly` `optional` **stallTimeoutMs?**: `number`

Defined in: [types/loopEngine.ts:110](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/loopEngine.ts#L110)

---

### toolFailureBreaker?

> `readonly` `optional` **toolFailureBreaker?**: [`AgenticLoopToolFailureBreaker`](AgenticLoopToolFailureBreaker.md)

Defined in: [types/loopEngine.ts:112](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/loopEngine.ts#L112)

Set only for adapter instances whose client has the TOOL_NOT_FOUND strike breaker today: both Gemini adapters (AI Studio, Vertex+Gemini) AND the Vertex+Claude call to createAnthropicLoopAdapter — NOT the native-Anthropic call to that same factory, and not Bedrock. See Verified Fact 4.

---

### resolveToolOnMiss?

> `readonly` `optional` **resolveToolOnMiss?**: (`name`) => \{ `execute`: (`args`, `opts`) => `Promise`\<`unknown`\>; \} \| `undefined`

Defined in: [types/loopEngine.ts:122](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/loopEngine.ts#L122)

Second lookup path, consulted when a tool call names nothing executable
in the caller's `options.tools` — used by adapters supporting mid-turn
discovery to hydrate a tool the model just found via `search_tools`, or a
deferred-catalog tool called by its advertised name, before the engine
falls through to TOOL_NOT_FOUND and the breaker strike. See the design
decision above for why this is a narrow lookup and not a dispatch
override.

#### Parameters

##### name

`string`

#### Returns

\{ `execute`: (`args`, `opts`) => `Promise`\<`unknown`\>; \} \| `undefined`

## Methods

### buildStepRequest()

> **buildStepRequest**(`conversation`, `step`): [`AgenticLoopStepRequest`](AgenticLoopStepRequest.md)

Defined in: [types/loopEngine.ts:131](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/loopEngine.ts#L131)

#### Parameters

##### conversation

`TConversation`

##### step

`number`

#### Returns

[`AgenticLoopStepRequest`](AgenticLoopStepRequest.md)

---

### executeStep()

> **executeStep**(`request`, `channel`, `signal`): `Promise`\<[`AgenticLoopStepResult`](AgenticLoopStepResult.md)\<`TRaw`\>\>

Defined in: [types/loopEngine.ts:135](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/loopEngine.ts#L135)

#### Parameters

##### request

[`AgenticLoopStepRequest`](AgenticLoopStepRequest.md)

##### channel

###### push

##### signal

`AbortSignal`

#### Returns

`Promise`\<[`AgenticLoopStepResult`](AgenticLoopStepResult.md)\<`TRaw`\>\>

---

### buildToolResultMessages()

> **buildToolResultMessages**(`conversation`, `stepResult`, `toolResults`): `TConversation`

Defined in: [types/loopEngine.ts:140](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/loopEngine.ts#L140)

#### Parameters

##### conversation

`TConversation`

##### stepResult

[`AgenticLoopStepResult`](AgenticLoopStepResult.md)\<`TRaw`\>

##### toolResults

[`AgenticLoopToolCallResult`](AgenticLoopToolCallResult.md)[]

#### Returns

`TConversation`

---

### mapFinishReason()

> **mapFinishReason**(`rawStopReason`, `hadToolCalls`): `string`

Defined in: [types/loopEngine.ts:145](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/loopEngine.ts#L145)

#### Parameters

##### rawStopReason

`string` \| `undefined`

##### hadToolCalls

`boolean`

#### Returns

`string`

---

### planReclaim()?

> `optional` **planReclaim**(`conversation`, `step`): [`AgenticLoopReclaimResult`](AgenticLoopReclaimResult.md)\<`TConversation`\> \| `undefined`

Defined in: [types/loopEngine.ts:151](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/loopEngine.ts#L151)

Optional: in-turn context-budget reclaim, called once per step before buildStepRequest.

#### Parameters

##### conversation

`TConversation`

##### step

`number`

#### Returns

[`AgenticLoopReclaimResult`](AgenticLoopReclaimResult.md)\<`TConversation`\> \| `undefined`

---

### isMalformedStep()?

> `optional` **isMalformedStep**(`stepResult`): `boolean`

Defined in: [types/loopEngine.ts:156](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/loopEngine.ts#L156)

Optional: Vertex+Gemini-only single-retry-on-malformed-call.

#### Parameters

##### stepResult

[`AgenticLoopStepResult`](AgenticLoopStepResult.md)\<`TRaw`\>

#### Returns

`boolean`

---

### buildMalformedRetryNote()?

> `optional` **buildMalformedRetryNote**(`conversation`): `TConversation`

Defined in: [types/loopEngine.ts:157](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/loopEngine.ts#L157)

#### Parameters

##### conversation

`TConversation`

#### Returns

`TConversation`
