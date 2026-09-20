[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / classifyJev

# Function: classifyJev()

> **classifyJev**(`input`, `decide`, `timeoutMs?`, `candidates?`, `thresholds?`): `Promise`\<[`ClassifierDecision`](../type-aliases/ClassifierDecision.md)\>

Defined in: [routing/classifierStrategies.ts:325](https://github.com/juspay/neurolink/blob/release/src/lib/routing/classifierStrategies.ts#L325)

Decision-model classifier — one request answers difficulty, capabilities,
risk and model selection at once.

Latency is flat in question count (1 question ~393ms, 400 ~465ms), so the
capability questions are effectively free and are asked speculatively even
when nothing downstream may need them. This is the opposite of the LLM
strategy's economics, where every extra field costs output tokens.

Returns the heuristic verdict — never throws — when no decision provider is
configured, the call fails, or the answer is not confident enough to act on.

## Parameters

### input

[`ClassifierRouterInput`](../type-aliases/ClassifierRouterInput.md)

### decide

[`DecisionCallerFn`](../type-aliases/DecisionCallerFn.md)

### timeoutMs?

`number`

### candidates?

[`ClassifierCandidate`](../type-aliases/ClassifierCandidate.md)[]

### thresholds?

#### upgrade?

`number`

#### downgrade?

`number`

## Returns

`Promise`\<[`ClassifierDecision`](../type-aliases/ClassifierDecision.md)\>
