[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / calculateExpiresAt

# Function: calculateExpiresAt()

> **calculateExpiresAt**(`expiresIn`): `number`

Defined in: [mcp/auth/tokenStorage.ts:165](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/mcp/auth/tokenStorage.ts#L165)

Calculate token expiration timestamp from expires_in value

## Parameters

### expiresIn

`number`

Token lifetime in seconds

## Returns

`number`

Expiration timestamp (Unix epoch in milliseconds)
