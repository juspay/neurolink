[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / createRoleMiddleware

# Function: createRoleMiddleware()

> **createRoleMiddleware**(`config`): [`MiddlewareDefinition`](../type-aliases/MiddlewareDefinition.md)

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
