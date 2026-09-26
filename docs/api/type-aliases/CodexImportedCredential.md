[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CodexImportedCredential

# Type Alias: CodexImportedCredential

> **CodexImportedCredential** = `object`

Result of importing a Codex credential (from auth.json or the OAuth flow).

## Properties

### accessToken

> **accessToken**: `string`

---

### refreshToken?

> `optional` **refreshToken?**: `string`

---

### idToken?

> `optional` **idToken?**: `string`

---

### accountId?

> `optional` **accountId?**: `string`

ChatGPT account id (from auth.json or decoded from the access token).

---

### expiresAt?

> `optional` **expiresAt?**: `number`

Epoch ms when the access token expires (decoded from the JWT `exp`).

---

### planType?

> `optional` **planType?**: `string`

ChatGPT plan type decoded from the token, for display only.

---

### email?

> `optional` **email?**: `string`

Account email decoded from the id token, for the account label.
