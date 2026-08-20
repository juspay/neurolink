[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareProvisionRequest

# Type Alias: ProxyShareProvisionRequest

> **ProxyShareProvisionRequest** = `object`

Defined in: [types/proxy.ts:3564](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3564)

One borrower's outstanding request for a resident credential.

Holds the challenge, never a verifier and never a token — the lender is not
in a position to leak what it does not have. `code` exists only between the
lender authorizing and the borrower claiming, and is erased by consumption.

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:3565](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3565)

---

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:3566](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3566)

---

### codeChallenge

> **codeChallenge**: `string`

Defined in: [types/proxy.ts:3568](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3568)

Base64url SHA-256 of the borrower's verifier.

---

### challengeMethod

> **challengeMethod**: `"S256"`

Defined in: [types/proxy.ts:3569](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3569)

---

### state

> **state**: `string`

Defined in: [types/proxy.ts:3571](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3571)

Borrower-chosen state, echoed through the authorization round trip.

---

### requestedAt

> **requestedAt**: `number`

Defined in: [types/proxy.ts:3572](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3572)

---

### expiresAt

> **expiresAt**: `number`

Defined in: [types/proxy.ts:3573](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3573)

---

### status

> **status**: [`ProxyShareProvisionStatus`](ProxyShareProvisionStatus.md)

Defined in: [types/proxy.ts:3574](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3574)

---

### code?

> `optional` **code?**: `string`

Defined in: [types/proxy.ts:3576](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3576)

Present only between authorization and the single claim that consumes it.

---

### authorizedAt?

> `optional` **authorizedAt?**: `number`

Defined in: [types/proxy.ts:3577](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3577)

---

### claimedAt?

> `optional` **claimedAt?**: `number`

Defined in: [types/proxy.ts:3578](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3578)

---

### accountLabel?

> `optional` **accountLabel?**: `string`

Defined in: [types/proxy.ts:3580](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3580)

Which of the lender's accounts was authorized, for the drift audit.
