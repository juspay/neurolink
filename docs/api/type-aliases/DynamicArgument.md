[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / DynamicArgument

# Type Alias: DynamicArgument\<T\>

> **DynamicArgument**\<`T`\> = `T` \| (() => `T`) \| (() => `Promise`\<`T`\>) \| ((`context`) => `T`) \| ((`context`) => `Promise`\<`T`\>)

Defined in: [types/dynamic.ts:44](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/dynamic.ts#L44)

A value that can be static, a function, or a context-aware function.

## Type Parameters

### T

`T`

## Example

```typescript
// Static
model: "gpt-4o";

// Function
model: () => process.env.MODEL || "gpt-4o";

// Context-aware
model: (ctx) =>
  ctx.requestContext.plan === "enterprise" ? "gpt-4o" : "gpt-4o-mini";
```
