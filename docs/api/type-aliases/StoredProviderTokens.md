[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / StoredProviderTokens

# Type Alias: StoredProviderTokens

> **StoredProviderTokens** = `object`

Per-provider token storage structure

## Properties

### tokens

> **tokens**: [`StoredOAuthTokens`](StoredOAuthTokens.md)

The stored tokens

---

### createdAt

> **createdAt**: `number`

When the tokens were stored

---

### lastAccessed

> **lastAccessed**: `number`

When the tokens were last accessed

---

### disabled?

> `optional` **disabled?**: `boolean`

Whether this provider's tokens are permanently disabled

---

### disabledAt?

> `optional` **disabledAt?**: `number`

When the tokens were disabled (Unix ms)

---

### disabledReason?

> `optional` **disabledReason?**: `string`

Reason the tokens were disabled (e.g., "refresh_invalid")
