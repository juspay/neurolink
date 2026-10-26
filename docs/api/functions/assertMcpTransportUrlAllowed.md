[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / assertMcpTransportUrlAllowed

# Function: assertMcpTransportUrlAllowed()

> **assertMcpTransportUrlAllowed**(`rawUrl`, `options`): `Promise`\<`void`\>

Enforce the policy described in this module's header on `rawUrl`.

Rejection is an `Error` whose message names the rule and, where one
applies, the opt-out (`allowPrivateNetwork`). The URL itself is quoted so
an operator can find the offending server entry; it never carries
credentials, because `headers` are not part of the URL.

## Parameters

### rawUrl

`string`

### options

[`McpTransportUrlPolicyOptions`](../type-aliases/McpTransportUrlPolicyOptions.md)

## Returns

`Promise`\<`void`\>
