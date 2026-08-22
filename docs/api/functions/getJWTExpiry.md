[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / getJWTExpiry

# Function: getJWTExpiry()

> **getJWTExpiry**(`token`): `number` \| `null`

Defined in: [client/auth.ts:529](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/client/auth.ts#L529)

Extract expiry time from a JWT token

## Parameters

### token

`string`

## Returns

`number` \| `null`

Expiry time in milliseconds, or null if not available
