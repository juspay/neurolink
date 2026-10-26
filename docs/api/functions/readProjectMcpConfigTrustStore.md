[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / readProjectMcpConfigTrustStore

# Function: readProjectMcpConfigTrustStore()

> **readProjectMcpConfigTrustStore**(`storePath?`): [`ProjectMcpConfigTrustStore`](../type-aliases/ProjectMcpConfigTrustStore.md)

Read the store. A missing, unreadable or malformed file reads as empty:
the only consequence is that every config has to be accepted again, which
is the safe direction.

## Parameters

### storePath?

`string` = `...`

## Returns

[`ProjectMcpConfigTrustStore`](../type-aliases/ProjectMcpConfigTrustStore.md)
