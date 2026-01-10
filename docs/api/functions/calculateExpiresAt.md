[**NeuroLink API Reference v8.32.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / calculateExpiresAt

# Function: calculateExpiresAt()

> **calculateExpiresAt**(`expiresIn`): `number`

Defined in: [mcp/auth/tokenStorage.ts:165](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/mcp/auth/tokenStorage.ts#L165)

Calculate token expiration timestamp from expires_in value

## Parameters

### expiresIn

`number`

Token lifetime in seconds

## Returns

`number`

Expiration timestamp (Unix epoch in milliseconds)
