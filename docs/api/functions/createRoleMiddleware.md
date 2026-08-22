[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / createRoleMiddleware

# Function: createRoleMiddleware()

> **createRoleMiddleware**(`config`): [`MiddlewareDefinition`](../type-aliases/MiddlewareDefinition.md)

Defined in: [server/middleware/auth.ts:228](https://github.com/juspay/neurolink/blob/release/src/lib/server/middleware/auth.ts#L228)

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
