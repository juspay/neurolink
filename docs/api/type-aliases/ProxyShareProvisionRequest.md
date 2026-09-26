[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareProvisionRequest

# Type Alias: ProxyShareProvisionRequest

> **ProxyShareProvisionRequest** = `object`

Defined in: [types/proxy.ts:4356](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4356)

One borrower's outstanding request for a resident credential.

Holds the challenge, never a verifier and never a token — the lender is not
in a position to leak what it does not have. `code` exists only between the
lender authorizing and the borrower claiming, and is erased by consumption.

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:4357](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4357)

---

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:4358](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4358)

---

### codeChallenge

> **codeChallenge**: `string`

Defined in: [types/proxy.ts:4360](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4360)

Base64url SHA-256 of the borrower's verifier.

---

### challengeMethod

> **challengeMethod**: `"S256"`

Defined in: [types/proxy.ts:4361](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4361)

---

### state

> **state**: `string`

Defined in: [types/proxy.ts:4363](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4363)

Borrower-chosen state, echoed through the authorization round trip.

---

### requestedAt

> **requestedAt**: `number`

Defined in: [types/proxy.ts:4364](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4364)

---

### expiresAt

> **expiresAt**: `number`

Defined in: [types/proxy.ts:4365](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4365)

---

### status

> **status**: [`ProxyShareProvisionStatus`](ProxyShareProvisionStatus.md)

Defined in: [types/proxy.ts:4366](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4366)

---

### code?

> `optional` **code?**: `string`

Defined in: [types/proxy.ts:4368](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4368)

Present only between authorization and the single claim that consumes it.

---

### authorizedAt?

> `optional` **authorizedAt?**: `number`

Defined in: [types/proxy.ts:4369](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4369)

---

### claimedAt?

> `optional` **claimedAt?**: `number`

Defined in: [types/proxy.ts:4370](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4370)

---

### accountLabel?

> `optional` **accountLabel?**: `string`

Defined in: [types/proxy.ts:4372](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4372)

Which of the lender's accounts was authorized, for the drift audit.
