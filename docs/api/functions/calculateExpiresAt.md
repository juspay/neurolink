[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / calculateExpiresAt

# Function: calculateExpiresAt()

> **calculateExpiresAt**(`expiresIn`): `number`

Defined in: [mcp/auth/tokenStorage.ts:165](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/auth/tokenStorage.ts#L165)

Calculate token expiration timestamp from expires_in value

## Parameters

### expiresIn

`number`

Token lifetime in seconds

## Returns

`number`

Expiration timestamp (Unix epoch in milliseconds)
