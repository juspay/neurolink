[**NeuroLink API Reference v8.32.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / globalCircuitBreakerManager

# Variable: globalCircuitBreakerManager

> `const` **globalCircuitBreakerManager**: [`CircuitBreakerManager`](../classes/CircuitBreakerManager.md)

Defined in: [mcp/mcpCircuitBreaker.ts:486](https://github.com/juspay/neurolink/blob/e2ee0ff27847312a233f21617e325b3d2c69c76c/src/lib/mcp/mcpCircuitBreaker.ts#L486)

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
