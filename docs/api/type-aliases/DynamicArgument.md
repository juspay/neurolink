[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / DynamicArgument

# Type Alias: DynamicArgument\<T\>

> **DynamicArgument**\<`T`\> = `T` \| (() => `T`) \| (() => `Promise`\<`T`\>) \| ((`context`) => `T`) \| ((`context`) => `Promise`\<`T`\>)

Defined in: [types/dynamic.ts:43](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/dynamic.ts#L43)

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
