[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CodexRotationFailure

# Type Alias: CodexRotationFailure

> **CodexRotationFailure** = `object`

Failure details recorded when a Codex account is rotated past.

## Properties

### lastFailure

> **lastFailure**: [`CodexFinalLogExtra`](CodexFinalLogExtra.md)

---

### lastErrorStatus

> **lastErrorStatus**: `number`

---

### lastErrorCode

> **lastErrorCode**: `string` \| `undefined`

---

### lastErrorMessage

> **lastErrorMessage**: `string`

---

### refusedRequest?

> `optional` **refusedRequest?**: `boolean`

The upstream refused the request itself (a policy or invalid-request
code), not the account: no other account would answer differently, so the
pool ends the request here instead of rotating.
