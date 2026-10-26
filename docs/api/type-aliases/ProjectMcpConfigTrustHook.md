[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProjectMcpConfigTrustHook

# Type Alias: ProjectMcpConfigTrustHook

> **ProjectMcpConfigTrustHook** = (`candidatePath`) => `Promise`\<`string` \| `null`\>

Registered by the CLI entry point once it has decided what to do about the
working directory's `.mcp-config.json`. Called with the candidate path the
moment a `NeuroLink` instance would load it; returns the path to load or
`null` to load nothing. A hook may also end the process (the CLI's
non-interactive refusal does), which is why it is asynchronous.

## Parameters

### candidatePath

`string`

## Returns

`Promise`\<`string` \| `null`\>
