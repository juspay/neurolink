[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / decodeJWTPayload

# Function: decodeJWTPayload()

> **decodeJWTPayload**(`token`): `Record`\<`string`, `unknown`\>

Defined in: [client/auth.ts:489](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/auth.ts#L489)

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
