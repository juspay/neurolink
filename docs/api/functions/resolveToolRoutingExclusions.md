[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / resolveToolRoutingExclusions

# Function: resolveToolRoutingExclusions()

> **resolveToolRoutingExclusions**(`params`): `Promise`\<`string`[]\>

Defined in: [core/toolRouting.ts:390](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/core/toolRouting.ts#L390)

Resolves which registered tool names to EXCLUDE for a single stream() turn.
Returns an empty list on any skip/failure path — see module doc.

## Parameters

### params

[`ToolRoutingResolutionParams`](../type-aliases/ToolRoutingResolutionParams.md)

## Returns

`Promise`\<`string`[]\>
