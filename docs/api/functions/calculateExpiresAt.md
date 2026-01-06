[**NeuroLink API Reference v8.32.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / calculateExpiresAt

# Function: calculateExpiresAt()

> **calculateExpiresAt**(`expiresIn`): `number`

Defined in: [mcp/auth/tokenStorage.ts:165](https://github.com/juspay/neurolink/blob/e2ee0ff27847312a233f21617e325b3d2c69c76c/src/lib/mcp/auth/tokenStorage.ts#L165)

Calculate token expiration timestamp from expires_in value

## Parameters

### expiresIn

`number`

Token lifetime in seconds

## Returns

`number`

Expiration timestamp (Unix epoch in milliseconds)
