[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / RouteHandler

# Type Alias: RouteHandler\<T\>

> **RouteHandler**\<`T`\> = (`ctx`) => `Promise`\<`T` \| [`ServerResponse`](ServerResponse.md)\<`T`\> \| `AsyncIterable`\<`unknown`\>\>

Defined in: [types/server.ts:436](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/server.ts#L436)

Route handler function

## Type Parameters

### T

`T` = `unknown`

## Parameters

### ctx

[`ServerContext`](ServerContext.md)

## Returns

`Promise`\<`T` \| [`ServerResponse`](ServerResponse.md)\<`T`\> \| `AsyncIterable`\<`unknown`\>\>
