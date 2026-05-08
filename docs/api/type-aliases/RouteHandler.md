[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / RouteHandler

# Type Alias: RouteHandler\<T\>

> **RouteHandler**\<`T`\> = (`ctx`) => `Promise`\<`T` \| [`ServerResponse`](ServerResponse.md)\<`T`\> \| `AsyncIterable`\<`unknown`\>\>

Defined in: [types/server.ts:436](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L436)

Route handler function

## Type Parameters

### T

`T` = `unknown`

## Parameters

### ctx

[`ServerContext`](ServerContext.md)

## Returns

`Promise`\<`T` \| [`ServerResponse`](ServerResponse.md)\<`T`\> \| `AsyncIterable`\<`unknown`\>\>
