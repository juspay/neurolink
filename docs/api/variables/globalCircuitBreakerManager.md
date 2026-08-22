[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / globalCircuitBreakerManager

# Variable: globalCircuitBreakerManager

> `const` **globalCircuitBreakerManager**: [`CircuitBreakerManager`](../classes/CircuitBreakerManager.md)

Defined in: [mcp/mcpCircuitBreaker.ts:547](https://github.com/juspay/neurolink/blob/release/src/lib/mcp/mcpCircuitBreaker.ts#L547)

MCP (Model Context Protocol) Plugin Ecosystem

Extensible plugin architecture based on research blueprint for
transforming NeuroLink into a Universal AI Development Platform.

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
