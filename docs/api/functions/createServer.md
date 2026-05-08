[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / createServer

# Function: createServer()

> **createServer**(`neurolink`, `options?`): `Promise`\<[`BaseServerAdapter`](../classes/BaseServerAdapter.md)\>

Defined in: [server/factory/serverAdapterFactory.ts:219](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/factory/serverAdapterFactory.ts#L219)

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
