[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / summarizeProjectMcpConfig

# Function: summarizeProjectMcpConfig()

> **summarizeProjectMcpConfig**(`configPath`): [`ProjectMcpConfigSummary`](../type-aliases/ProjectMcpConfigSummary.md)

Read and describe a project config without evaluating any of it. Values
under `env` and `headers` are never included — a summary is printed to a
terminal and must not echo a secret the file happens to inline.

## Parameters

### configPath

`string`

## Returns

[`ProjectMcpConfigSummary`](../type-aliases/ProjectMcpConfigSummary.md)
