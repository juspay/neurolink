[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareProvisionRequest

# Type Alias: ProxyShareProvisionRequest

> **ProxyShareProvisionRequest** = `object`

Defined in: [types/proxy.ts:4406](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4406)

One borrower's outstanding request for a resident credential.

Holds the challenge, never a verifier and never a token — the lender is not
in a position to leak what it does not have. `code` exists only between the
lender authorizing and the borrower claiming, and is erased by consumption.

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:4407](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4407)

---

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:4408](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4408)

---

### codeChallenge

> **codeChallenge**: `string`

Defined in: [types/proxy.ts:4410](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4410)

Base64url SHA-256 of the borrower's verifier.

---

### challengeMethod

> **challengeMethod**: `"S256"`

Defined in: [types/proxy.ts:4411](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4411)

---

### state

> **state**: `string`

Defined in: [types/proxy.ts:4413](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4413)

Borrower-chosen state, echoed through the authorization round trip.

---

### requestedAt

> **requestedAt**: `number`

Defined in: [types/proxy.ts:4414](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4414)

---

### expiresAt

> **expiresAt**: `number`

Defined in: [types/proxy.ts:4415](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4415)

---

### status

> **status**: [`ProxyShareProvisionStatus`](ProxyShareProvisionStatus.md)

Defined in: [types/proxy.ts:4416](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4416)

---

### code?

> `optional` **code?**: `string`

Defined in: [types/proxy.ts:4418](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4418)

Present only between authorization and the single claim that consumes it.

---

### authorizedAt?

> `optional` **authorizedAt?**: `number`

Defined in: [types/proxy.ts:4419](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4419)

---

### claimedAt?

> `optional` **claimedAt?**: `number`

Defined in: [types/proxy.ts:4420](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4420)

---

### accountLabel?

> `optional` **accountLabel?**: `string`

Defined in: [types/proxy.ts:4422](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4422)

Which of the lender's accounts was authorized, for the drift audit.
