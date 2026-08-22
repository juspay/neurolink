[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / buildRoutingQueryFromHistory

# Function: buildRoutingQueryFromHistory()

> **buildRoutingQueryFromHistory**(`recentMessages`, `currentQuery`, `maxChars?`, `maxMessages?`): `string`

Defined in: [core/toolRouting.ts:109](https://github.com/juspay/neurolink/blob/release/src/lib/core/toolRouting.ts#L109)

Folds a bounded window of recent conversation turns together with the current
user query into a single transcript string for the router.

The pre-call router would otherwise see only the current turn's raw text, so
a contextless follow-up ("yes please", "the first one") gives it nothing to
classify — it fails open and routing does no narrowing on that turn. Pairing
the current query with the last few turns restores the intent the router
needs to pick the right servers.

Only user/assistant text turns are kept (tool_call/tool_result turns are
dropped), matching the history the main model receives. Each kept turn is
rendered in full; the only bound is the overall `maxChars` ceiling, applied
by keeping the MOST RECENT content (oldest turns are dropped first and the
current query always survives at the tail). Returns the bare query when there
is no usable prior history.

## Parameters

### recentMessages

`object`[]

### currentQuery

`string`

### maxChars?

`number` = `MAX_ROUTER_QUERY_CHARS`

### maxMessages?

`number` = `MAX_ROUTING_HISTORY_MESSAGES`

## Returns

`string`
