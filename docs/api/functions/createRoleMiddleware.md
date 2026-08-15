[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / createRoleMiddleware

# Function: createRoleMiddleware()

> **createRoleMiddleware**(`config`): [`MiddlewareDefinition`](../type-aliases/MiddlewareDefinition.md)

Defined in: [server/middleware/auth.ts:228](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/server/middleware/auth.ts#L228)

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
