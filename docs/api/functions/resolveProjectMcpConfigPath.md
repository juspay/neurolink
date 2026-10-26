[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / resolveProjectMcpConfigPath

# Function: resolveProjectMcpConfigPath()

> **resolveProjectMcpConfigPath**(`options`): `Promise`\<[`ProjectMcpConfigPathResolution`](../type-aliases/ProjectMcpConfigPathResolution.md) \| `null`\>

Decide which project config, if any, a `NeuroLink` instance loads.

Precedence: an explicit `configPath`; `trustProjectConfig` for
`<cwd>/.mcp-config.json`; the CLI's registered hook; the legacy
`enableManualMCP` registry option. With none of them the answer is `null`
and nothing is read from the working directory — the SDK default.

## Parameters

### options

#### cwd?

`string`

#### configPath?

`string`

#### trustProjectConfig?

`boolean`

#### enableManualMCP?

`boolean`

## Returns

`Promise`\<[`ProjectMcpConfigPathResolution`](../type-aliases/ProjectMcpConfigPathResolution.md) \| `null`\>
