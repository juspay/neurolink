[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareProvisionRequest

# Type Alias: ProxyShareProvisionRequest

> **ProxyShareProvisionRequest** = `object`

One borrower's outstanding request for a resident credential.

Holds the challenge, never a verifier and never a token — the lender is not
in a position to leak what it does not have. `code` exists only between the
lender authorizing and the borrower claiming, and is erased by consumption.

## Properties

### schemaVersion

> **schemaVersion**: `1`

---

### grantId

> **grantId**: `string`

---

### codeChallenge

> **codeChallenge**: `string`

Base64url SHA-256 of the borrower's verifier.

---

### challengeMethod

> **challengeMethod**: `"S256"`

---

### state

> **state**: `string`

Borrower-chosen state, echoed through the authorization round trip.

---

### requestedAt

> **requestedAt**: `number`

---

### expiresAt

> **expiresAt**: `number`

---

### status

> **status**: [`ProxyShareProvisionStatus`](ProxyShareProvisionStatus.md)

---

### code?

> `optional` **code?**: `string`

Present only between authorization and the single claim that consumes it.

---

### authorizedAt?

> `optional` **authorizedAt?**: `number`

---

### claimedAt?

> `optional` **claimedAt?**: `number`

---

### accountLabel?

> `optional` **accountLabel?**: `string`

Which of the lender's accounts was authorized, for the drift audit.
