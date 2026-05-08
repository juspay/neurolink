[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / isJWTExpired

# Function: isJWTExpired()

> **isJWTExpired**(`token`, `bufferMs?`): `boolean`

Defined in: [client/auth.ts:514](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/auth.ts#L514)

Check if a JWT token is expired

## Parameters

### token

`string`

### bufferMs?

`number` = `0`

## Returns

`boolean`

## Example

```typescript
if (isJWTExpired(token)) {
  // Refresh the token
}
```
