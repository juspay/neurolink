[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / createAgentWebSocketHandler

# Function: createAgentWebSocketHandler()

> **createAgentWebSocketHandler**(`neurolink`): [`WebSocketHandler`](../type-aliases/WebSocketHandler.md)

Defined in: [server/websocket/WebSocketHandler.ts:600](https://github.com/juspay/neurolink/blob/release/src/lib/server/websocket/WebSocketHandler.ts#L600)

Server Adapters for exposing NeuroLink as HTTP APIs

Supports multiple frameworks: Hono, Express, Fastify, Koa

## Parameters

### neurolink

[`NeuroLink`](../classes/NeuroLink.md)

## Returns

[`WebSocketHandler`](../type-aliases/WebSocketHandler.md)

## Example

```typescript
import { NeuroLink } from "@juspay/neurolink";
import { createServer } from "@juspay/neurolink/server";

const neurolink = new NeuroLink({ provider: "openai" });
const server = await createServer(neurolink, {
  framework: "hono",
  config: { port: 3000 },
});
await server.start();
```
