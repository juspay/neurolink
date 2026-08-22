[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClientMiddleware

# Type Alias: ClientMiddleware

> **ClientMiddleware** = (`request`, `next`) => `Promise`\<[`ClientMiddlewareResponse`](ClientMiddlewareResponse.md)\>

Defined in: [types/client.ts:463](https://github.com/juspay/neurolink/blob/release/src/lib/types/client.ts#L463)

ClientMiddleware function type

## Parameters

### request

[`ClientMiddlewareRequest`](ClientMiddlewareRequest.md)

### next

() => `Promise`\<[`ClientMiddlewareResponse`](ClientMiddlewareResponse.md)\>

## Returns

`Promise`\<[`ClientMiddlewareResponse`](ClientMiddlewareResponse.md)\>
