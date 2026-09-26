[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareProvisionRequest

# Type Alias: ProxyShareProvisionRequest

> **ProxyShareProvisionRequest** = `object`

Defined in: [types/proxy.ts:4416](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4416)

One borrower's outstanding request for a resident credential.

Holds the challenge, never a verifier and never a token — the lender is not
in a position to leak what it does not have. `code` exists only between the
lender authorizing and the borrower claiming, and is erased by consumption.

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:4417](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4417)

---

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:4418](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4418)

---

### codeChallenge

> **codeChallenge**: `string`

Defined in: [types/proxy.ts:4420](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4420)

Base64url SHA-256 of the borrower's verifier.

---

### challengeMethod

> **challengeMethod**: `"S256"`

Defined in: [types/proxy.ts:4421](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4421)

---

### state

> **state**: `string`

Defined in: [types/proxy.ts:4423](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4423)

Borrower-chosen state, echoed through the authorization round trip.

---

### requestedAt

> **requestedAt**: `number`

Defined in: [types/proxy.ts:4424](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4424)

---

### expiresAt

> **expiresAt**: `number`

Defined in: [types/proxy.ts:4425](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4425)

---

### status

> **status**: [`ProxyShareProvisionStatus`](ProxyShareProvisionStatus.md)

Defined in: [types/proxy.ts:4426](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4426)

---

### code?

> `optional` **code?**: `string`

Defined in: [types/proxy.ts:4428](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4428)

Present only between authorization and the single claim that consumes it.

---

### authorizedAt?

> `optional` **authorizedAt?**: `number`

Defined in: [types/proxy.ts:4429](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4429)

---

### claimedAt?

> `optional` **claimedAt?**: `number`

Defined in: [types/proxy.ts:4430](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4430)

---

### accountLabel?

> `optional` **accountLabel?**: `string`

Defined in: [types/proxy.ts:4432](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4432)

Which of the lender's accounts was authorized, for the drift audit.
