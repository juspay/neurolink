[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ResolvedConfig

# Type Alias: ResolvedConfig\<T\>

> **ResolvedConfig**\<`T`\> = `{ [K in keyof T]: T[K] extends DynamicArgument<infer U> ? U : T[K] }`

Defined in: [types/dynamic.ts:119](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/dynamic.ts#L119)

## Type Parameters

### T

`T`
