[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / getTrustedMcpConfigStorePath

# Function: getTrustedMcpConfigStorePath()

> **getTrustedMcpConfigStorePath**(): `string`

MCP (Model Context Protocol) Plugin Ecosystem

Extensible plugin architecture based on research blueprint for
transforming NeuroLink into a Universal AI Development Platform.

## Returns

`string`

## Example

```typescript
import { mcpEcosystem, readFile, writeFile } from "@juspay/neurolink";

// Initialize the ecosystem
await mcpEcosystem.initialize();

// List available plugins
const plugins = await mcpEcosystem.list();

// Use filesystem operations
const content = await readFile("README.md");
await writeFile("output.txt", "Hello from MCP!");
```
