[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClientMiddleware

# Type Alias: ClientMiddleware

> **ClientMiddleware** = (`request`, `next`) => `Promise`\<[`ClientMiddlewareResponse`](ClientMiddlewareResponse.md)\>

Defined in: [types/client.ts:463](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/client.ts#L463)

ClientMiddleware function type

## Parameters

### request

[`ClientMiddlewareRequest`](ClientMiddlewareRequest.md)

### next

() => `Promise`\<[`ClientMiddlewareResponse`](ClientMiddlewareResponse.md)\>

## Returns

`Promise`\<[`ClientMiddlewareResponse`](ClientMiddlewareResponse.md)\>
