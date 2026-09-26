[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ResolvedConfig

# Type Alias: ResolvedConfig\<T\>

> **ResolvedConfig**\<`T`\> = `{ [K in keyof T]: T[K] extends DynamicArgument<infer U> ? U : T[K] }`

## Type Parameters

### T

`T`
