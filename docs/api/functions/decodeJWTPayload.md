[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / decodeJWTPayload

# Function: decodeJWTPayload()

> **decodeJWTPayload**(`token`): `Record`\<`string`, `unknown`\>

Decode a JWT token payload without verification

## Parameters

### token

`string`

## Returns

`Record`\<`string`, `unknown`\>

## Example

```typescript
const payload = decodeJWTPayload(token);
console.log("Token expires at:", new Date(payload.exp * 1000));
```
