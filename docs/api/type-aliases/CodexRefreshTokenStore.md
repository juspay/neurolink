[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CodexRefreshTokenStore

# Type Alias: CodexRefreshTokenStore

> **CodexRefreshTokenStore** = `object`

Defined in: [types/proxy.ts:996](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L996)

Minimal persistence contract needed by Codex rotating-token refreshes.

## Methods

### peekTokens()

> **peekTokens**(`provider`): `Promise`\<[`StoredOAuthTokens`](StoredOAuthTokens.md) \| `null`\>

Defined in: [types/proxy.ts:997](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L997)

#### Parameters

##### provider

`string`

#### Returns

`Promise`\<[`StoredOAuthTokens`](StoredOAuthTokens.md) \| `null`\>

---

### saveTokens()

> **saveTokens**(`provider`, `tokens`): `Promise`\<`void`\>

Defined in: [types/proxy.ts:998](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L998)

#### Parameters

##### provider

`string`

##### tokens

[`StoredOAuthTokens`](StoredOAuthTokens.md)

#### Returns

`Promise`\<`void`\>
