[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / createServer

# Function: createServer()

> **createServer**(`neurolink`, `options?`): `Promise`\<[`BaseServerAdapter`](../classes/BaseServerAdapter.md)\>

Defined in: [server/factory/serverAdapterFactory.ts:219](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/server/factory/serverAdapterFactory.ts#L219)

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
