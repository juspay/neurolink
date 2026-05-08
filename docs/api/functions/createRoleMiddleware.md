[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / createRoleMiddleware

# Function: createRoleMiddleware()

> **createRoleMiddleware**(`config`): [`MiddlewareDefinition`](../type-aliases/MiddlewareDefinition.md)

Defined in: [server/middleware/auth.ts:228](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/middleware/auth.ts#L228)

Role-based access control middleware
Use after authentication middleware

## Parameters

### config

#### requiredRoles

`string`[]

#### requireAll?

`boolean`

#### errorMessage?

`string`

## Returns

[`MiddlewareDefinition`](../type-aliases/MiddlewareDefinition.md)

## Example

```typescript
const adminOnly = createRoleMiddleware({
  requiredRoles: ["admin"],
  errorMessage: "Admin access required",
});
```
