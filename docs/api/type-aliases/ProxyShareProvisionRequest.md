[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareProvisionRequest

# Type Alias: ProxyShareProvisionRequest

> **ProxyShareProvisionRequest** = `object`

Defined in: [types/proxy.ts:4354](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4354)

One borrower's outstanding request for a resident credential.

Holds the challenge, never a verifier and never a token — the lender is not
in a position to leak what it does not have. `code` exists only between the
lender authorizing and the borrower claiming, and is erased by consumption.

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:4355](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4355)

---

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:4356](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4356)

---

### codeChallenge

> **codeChallenge**: `string`

Defined in: [types/proxy.ts:4358](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4358)

Base64url SHA-256 of the borrower's verifier.

---

### challengeMethod

> **challengeMethod**: `"S256"`

Defined in: [types/proxy.ts:4359](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4359)

---

### state

> **state**: `string`

Defined in: [types/proxy.ts:4361](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4361)

Borrower-chosen state, echoed through the authorization round trip.

---

### requestedAt

> **requestedAt**: `number`

Defined in: [types/proxy.ts:4362](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4362)

---

### expiresAt

> **expiresAt**: `number`

Defined in: [types/proxy.ts:4363](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4363)

---

### status

> **status**: [`ProxyShareProvisionStatus`](ProxyShareProvisionStatus.md)

Defined in: [types/proxy.ts:4364](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4364)

---

### code?

> `optional` **code?**: `string`

Defined in: [types/proxy.ts:4366](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4366)

Present only between authorization and the single claim that consumes it.

---

### authorizedAt?

> `optional` **authorizedAt?**: `number`

Defined in: [types/proxy.ts:4367](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4367)

---

### claimedAt?

> `optional` **claimedAt?**: `number`

Defined in: [types/proxy.ts:4368](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4368)

---

### accountLabel?

> `optional` **accountLabel?**: `string`

Defined in: [types/proxy.ts:4370](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4370)

Which of the lender's accounts was authorized, for the drift audit.
