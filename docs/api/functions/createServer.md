[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / createServer

# Function: createServer()

> **createServer**(`neurolink`, `options?`): `Promise`\<[`BaseServerAdapter`](../classes/BaseServerAdapter.md)\>

Defined in: [server/factory/serverAdapterFactory.ts:219](https://github.com/juspay/neurolink/blob/release/src/lib/server/factory/serverAdapterFactory.ts#L219)

Quick helper to create a server from NeuroLink instance

## Parameters

### neurolink

[`NeuroLink`](../classes/NeuroLink.md)

### options?

#### framework?

[`ServerFramework`](../type-aliases/ServerFramework.md)

#### config?

[`ServerAdapterConfig`](../type-aliases/ServerAdapterConfig.md)

## Returns

`Promise`\<[`BaseServerAdapter`](../classes/BaseServerAdapter.md)\>

## Example

```typescript
const neurolink = new NeuroLink({ ... });
const server = await createServer(neurolink);
await server.initialize();
await server.start();
```
