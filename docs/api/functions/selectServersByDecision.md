[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / selectServersByDecision

# Function: selectServersByDecision()

> **selectServersByDecision**(`userQuery`, `routableServers`, `decide`, `options?`): `Promise`\<[`ToolRoutingDecisionOutcome`](../type-aliases/ToolRoutingDecisionOutcome.md) \| `null`\>

Defined in: [core/toolRoutingDecision.ts:108](https://github.com/juspay/neurolink/blob/release/src/lib/core/toolRoutingDecision.ts#L108)

Ask one yes/no question per routable server and return the servers to keep.

Returns `null` when the caller should fall through to its existing path:
no decision provider, a failed call, fewer than two servers, or an answer
set that would change nothing.

## Parameters

### userQuery

`string`

### routableServers

[`ToolRoutingCatalogEntry`](../type-aliases/ToolRoutingCatalogEntry.md)[]

### decide

[`DecisionCallerFn`](../type-aliases/DecisionCallerFn.md)

### options?

#### timeoutMs?

`number`

#### minDropConfidence?

`number`

## Returns

`Promise`\<[`ToolRoutingDecisionOutcome`](../type-aliases/ToolRoutingDecisionOutcome.md) \| `null`\>
