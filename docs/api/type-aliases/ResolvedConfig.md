[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ResolvedConfig

# Type Alias: ResolvedConfig\<T\>

> **ResolvedConfig**\<`T`\> = `{ [K in keyof T]: T[K] extends DynamicArgument<infer U> ? U : T[K] }`

Defined in: [types/dynamic.ts:131](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/dynamic.ts#L131)

## Type Parameters

### T

`T`
