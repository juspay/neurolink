[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / decodeJWTPayload

# Function: decodeJWTPayload()

> **decodeJWTPayload**(`token`): `Record`\<`string`, `unknown`\>

Defined in: [client/auth.ts:486](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/client/auth.ts#L486)

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
