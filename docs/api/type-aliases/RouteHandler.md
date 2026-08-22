[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / RouteHandler

# Type Alias: RouteHandler\<T\>

> **RouteHandler**\<`T`\> = (`ctx`) => `Promise`\<`T` \| [`ServerResponse`](ServerResponse.md)\<`T`\> \| `AsyncIterable`\<`unknown`\>\>

Defined in: [types/server.ts:436](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/server.ts#L436)

Route handler function

## Type Parameters

### T

`T` = `unknown`

## Parameters

### ctx

[`ServerContext`](ServerContext.md)

## Returns

`Promise`\<`T` \| [`ServerResponse`](ServerResponse.md)\<`T`\> \| `AsyncIterable`\<`unknown`\>\>
