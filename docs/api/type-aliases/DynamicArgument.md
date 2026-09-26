[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DynamicArgument

# Type Alias: DynamicArgument\<T\>

> **DynamicArgument**\<`T`\> = `T` \| (() => `T`) \| (() => `Promise`\<`T`\>) \| ((`context`) => `T`) \| ((`context`) => `Promise`\<`T`\>)

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
