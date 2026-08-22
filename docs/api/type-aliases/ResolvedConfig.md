[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ResolvedConfig

# Type Alias: ResolvedConfig\<T\>

> **ResolvedConfig**\<`T`\> = `{ [K in keyof T]: T[K] extends DynamicArgument<infer U> ? U : T[K] }`

Defined in: [types/dynamic.ts:131](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/dynamic.ts#L131)

## Type Parameters

### T

`T`
