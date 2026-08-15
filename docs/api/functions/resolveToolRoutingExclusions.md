[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / resolveToolRoutingExclusions

# Function: resolveToolRoutingExclusions()

> **resolveToolRoutingExclusions**(`params`): `Promise`\<`string`[]\>

Defined in: [core/toolRouting.ts:390](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/core/toolRouting.ts#L390)

Resolves which registered tool names to EXCLUDE for a single stream() turn.
Returns an empty list on any skip/failure path — see module doc.

## Parameters

### params

[`ToolRoutingResolutionParams`](../type-aliases/ToolRoutingResolutionParams.md)

## Returns

`Promise`\<`string`[]\>
