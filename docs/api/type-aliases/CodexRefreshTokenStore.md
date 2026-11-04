[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CodexRefreshTokenStore

# Type Alias: CodexRefreshTokenStore

> **CodexRefreshTokenStore** = `object`

Minimal persistence contract needed by Codex rotating-token refreshes.

## Methods

### peekTokens()

> **peekTokens**(`provider`): `Promise`\<[`StoredOAuthTokens`](StoredOAuthTokens.md) \| `null`\>

#### Parameters

##### provider

`string`

#### Returns

`Promise`\<[`StoredOAuthTokens`](StoredOAuthTokens.md) \| `null`\>

---

### saveTokens()

> **saveTokens**(`provider`, `tokens`): `Promise`\<`void`\>

#### Parameters

##### provider

`string`

##### tokens

[`StoredOAuthTokens`](StoredOAuthTokens.md)

#### Returns

`Promise`\<`void`\>

---

### saveTokensIf()?

> `optional` **saveTokensIf**(`provider`, `tokens`, `guard`): `Promise`\<`boolean`\>

Compare-and-set save under the store's lock; the real token store has it.

#### Parameters

##### provider

`string`

##### tokens

[`StoredOAuthTokens`](StoredOAuthTokens.md)

##### guard

(`providers`) => `boolean`

#### Returns

`Promise`\<`boolean`\>

---

### getProviderSnapshot()?

> `optional` **getProviderSnapshot**(): `Promise`\<`Record`\<`string`, \{ `tokens?`: [`StoredOAuthTokens`](StoredOAuthTokens.md); \}\>\>

Present on the real token store; lets a refresh also reach sibling labels.

#### Returns

`Promise`\<`Record`\<`string`, \{ `tokens?`: [`StoredOAuthTokens`](StoredOAuthTokens.md); \}\>\>
