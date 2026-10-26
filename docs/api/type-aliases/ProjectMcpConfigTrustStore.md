[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProjectMcpConfigTrustStore

# Type Alias: ProjectMcpConfigTrustStore

> **ProjectMcpConfigTrustStore** = `object`

On-disk shape of `~/.neurolink/trusted-mcp-configs.json`: absolute config
path → the hash the user accepted. A changed file no longer matches and
has to be accepted again.

## Properties

### version

> **version**: `1`

---

### entries

> **entries**: `Record`\<`string`, [`ProjectMcpConfigTrustEntry`](ProjectMcpConfigTrustEntry.md)\>
