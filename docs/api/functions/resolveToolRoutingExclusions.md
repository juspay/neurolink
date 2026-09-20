[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / resolveToolRoutingExclusions

# Function: resolveToolRoutingExclusions()

> **resolveToolRoutingExclusions**(`params`): `Promise`\<`string`[]\>

Defined in: [core/toolRouting.ts:400](https://github.com/juspay/neurolink/blob/release/src/lib/core/toolRouting.ts#L400)

Resolves which registered tool names to EXCLUDE for a single stream() turn.
Returns an empty list on any skip/failure path — see module doc.

## Parameters

### params

[`ToolRoutingResolutionParams`](../type-aliases/ToolRoutingResolutionParams.md)

## Returns

`Promise`\<`string`[]\>
