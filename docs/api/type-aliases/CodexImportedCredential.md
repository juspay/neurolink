[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CodexImportedCredential

# Type Alias: CodexImportedCredential

> **CodexImportedCredential** = `object`

Defined in: [types/codex.ts:34](https://github.com/juspay/neurolink/blob/release/src/lib/types/codex.ts#L34)

Result of importing a Codex credential (from auth.json or the OAuth flow).

## Properties

### accessToken

> **accessToken**: `string`

Defined in: [types/codex.ts:35](https://github.com/juspay/neurolink/blob/release/src/lib/types/codex.ts#L35)

---

### refreshToken?

> `optional` **refreshToken?**: `string`

Defined in: [types/codex.ts:36](https://github.com/juspay/neurolink/blob/release/src/lib/types/codex.ts#L36)

---

### idToken?

> `optional` **idToken?**: `string`

Defined in: [types/codex.ts:37](https://github.com/juspay/neurolink/blob/release/src/lib/types/codex.ts#L37)

---

### accountId?

> `optional` **accountId?**: `string`

Defined in: [types/codex.ts:39](https://github.com/juspay/neurolink/blob/release/src/lib/types/codex.ts#L39)

ChatGPT account id (from auth.json or decoded from the access token).

---

### expiresAt?

> `optional` **expiresAt?**: `number`

Defined in: [types/codex.ts:41](https://github.com/juspay/neurolink/blob/release/src/lib/types/codex.ts#L41)

Epoch ms when the access token expires (decoded from the JWT `exp`).

---

### planType?

> `optional` **planType?**: `string`

Defined in: [types/codex.ts:43](https://github.com/juspay/neurolink/blob/release/src/lib/types/codex.ts#L43)

ChatGPT plan type decoded from the token, for display only.

---

### email?

> `optional` **email?**: `string`

Defined in: [types/codex.ts:45](https://github.com/juspay/neurolink/blob/release/src/lib/types/codex.ts#L45)

Account email decoded from the id token, for the account label.
