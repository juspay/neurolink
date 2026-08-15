[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / getJWTExpiry

# Function: getJWTExpiry()

> **getJWTExpiry**(`token`): `number` \| `null`

Defined in: [client/auth.ts:529](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/client/auth.ts#L529)

Extract expiry time from a JWT token

## Parameters

### token

`string`

## Returns

`number` \| `null`

Expiry time in milliseconds, or null if not available
