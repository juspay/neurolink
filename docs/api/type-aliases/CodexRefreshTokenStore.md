[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CodexRefreshTokenStore

# Type Alias: CodexRefreshTokenStore

> **CodexRefreshTokenStore** = `object`

Defined in: [types/proxy.ts:795](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L795)

Minimal persistence contract needed by Codex rotating-token refreshes.

## Methods

### peekTokens()

> **peekTokens**(`provider`): `Promise`\<[`StoredOAuthTokens`](StoredOAuthTokens.md) \| `null`\>

Defined in: [types/proxy.ts:796](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L796)

#### Parameters

##### provider

`string`

#### Returns

`Promise`\<[`StoredOAuthTokens`](StoredOAuthTokens.md) \| `null`\>

---

### saveTokens()

> **saveTokens**(`provider`, `tokens`): `Promise`\<`void`\>

Defined in: [types/proxy.ts:797](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L797)

#### Parameters

##### provider

`string`

##### tokens

[`StoredOAuthTokens`](StoredOAuthTokens.md)

#### Returns

`Promise`\<`void`\>
