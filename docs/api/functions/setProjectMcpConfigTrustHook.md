[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / setProjectMcpConfigTrustHook

# Function: setProjectMcpConfigTrustHook()

> **setProjectMcpConfigTrustHook**(`hook`): `void`

Register (or clear, with `null`) the process-wide hook the CLI uses to hand
its trust decision to every `NeuroLink` instance built afterwards. SDK
hosts do not need this: they pass `mcp.configPath` or
`mcp.trustProjectConfig` to the constructor instead.

## Parameters

### hook

[`ProjectMcpConfigTrustHook`](../type-aliases/ProjectMcpConfigTrustHook.md) \| `null`

## Returns

`void`
