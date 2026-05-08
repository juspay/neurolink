[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClientMiddleware

# Type Alias: ClientMiddleware

> **ClientMiddleware** = (`request`, `next`) => `Promise`\<[`ClientMiddlewareResponse`](ClientMiddlewareResponse.md)\>

Defined in: [types/client.ts:463](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L463)

ClientMiddleware function type

## Parameters

### request

[`ClientMiddlewareRequest`](ClientMiddlewareRequest.md)

### next

() => `Promise`\<[`ClientMiddlewareResponse`](ClientMiddlewareResponse.md)\>

## Returns

`Promise`\<[`ClientMiddlewareResponse`](ClientMiddlewareResponse.md)\>
