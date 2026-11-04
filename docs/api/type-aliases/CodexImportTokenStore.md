[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CodexImportTokenStore

# Type Alias: CodexImportTokenStore

> **CodexImportTokenStore** = `object`

Token-store operations needed to import a Codex credential into the pool.

## Properties

### getProviderSnapshot

> **getProviderSnapshot**: () => `Promise`\<`Record`\<`string`, \{ `tokens?`: [`StoredOAuthTokens`](StoredOAuthTokens.md); \}\>\>

#### Returns

`Promise`\<`Record`\<`string`, \{ `tokens?`: [`StoredOAuthTokens`](StoredOAuthTokens.md); \}\>\>

---

### saveTokensIf

> **saveTokensIf**: (`key`, `tokens`, `guard`, `options?`) => `Promise`\<`boolean`\>

#### Parameters

##### key

`string`

##### tokens

[`StoredOAuthTokens`](StoredOAuthTokens.md)

##### guard

(`providers`) => `boolean`

##### options?

###### enable?

`boolean`

#### Returns

`Promise`\<`boolean`\>
