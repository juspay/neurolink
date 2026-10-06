[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / WhistleWorkerOutgoing

# Type Alias: WhistleWorkerOutgoing\<T\>

> **WhistleWorkerOutgoing**\<`T`\> = `T` _extends_ `unknown` ? `Omit`\<`T`, `"id"`\> : `never`

A worker request before the engine stamps its id (the `Omit` distributes over the union).

## Type Parameters

### T

`T` = [`WhistleWorkerRequest`](WhistleWorkerRequest.md)
