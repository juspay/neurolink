[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / getJWTExpiry

# Function: getJWTExpiry()

> **getJWTExpiry**(`token`): `number` \| `null`

Defined in: [client/auth.ts:532](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/auth.ts#L532)

Extract expiry time from a JWT token

## Parameters

### token

`string`

## Returns

`number` \| `null`

Expiry time in milliseconds, or null if not available
