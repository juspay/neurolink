[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProjectMcpConfigSource

# Type Alias: ProjectMcpConfigSource

> **ProjectMcpConfigSource** = `"configPath"` \| `"trustProjectConfig"` \| `"cliTrust"` \| `"enableManualMCP"`

Which rule let a project config be loaded. `configPath` and
`trustProjectConfig` come from the `NeuroLink` constructor's `mcp` option;
`cliTrust` is the CLI's hash-pinned acceptance; `enableManualMCP` is the
`ProviderRegistry` option a host set after construction.
