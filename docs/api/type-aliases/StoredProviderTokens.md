[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / StoredProviderTokens

# Type Alias: StoredProviderTokens

> **StoredProviderTokens** = `object`

Defined in: [types/auth.ts:76](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/auth.ts#L76)

Per-provider token storage structure

## Properties

### tokens

> **tokens**: [`StoredOAuthTokens`](StoredOAuthTokens.md)

Defined in: [types/auth.ts:78](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/auth.ts#L78)

The stored tokens

---

### createdAt

> **createdAt**: `number`

Defined in: [types/auth.ts:80](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/auth.ts#L80)

When the tokens were stored

---

### lastAccessed

> **lastAccessed**: `number`

Defined in: [types/auth.ts:82](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/auth.ts#L82)

When the tokens were last accessed

---

### disabled?

> `optional` **disabled?**: `boolean`

Defined in: [types/auth.ts:84](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/auth.ts#L84)

Whether this provider's tokens are permanently disabled

---

### disabledAt?

> `optional` **disabledAt?**: `number`

Defined in: [types/auth.ts:86](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/auth.ts#L86)

When the tokens were disabled (Unix ms)

---

### disabledReason?

> `optional` **disabledReason?**: `string`

Defined in: [types/auth.ts:88](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/auth.ts#L88)

Reason the tokens were disabled (e.g., "refresh_invalid")
