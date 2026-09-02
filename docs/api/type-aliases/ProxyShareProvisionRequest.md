[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareProvisionRequest

# Type Alias: ProxyShareProvisionRequest

> **ProxyShareProvisionRequest** = `object`

Defined in: [types/proxy.ts:3665](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3665)

One borrower's outstanding request for a resident credential.

Holds the challenge, never a verifier and never a token — the lender is not
in a position to leak what it does not have. `code` exists only between the
lender authorizing and the borrower claiming, and is erased by consumption.

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:3666](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3666)

---

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:3667](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3667)

---

### codeChallenge

> **codeChallenge**: `string`

Defined in: [types/proxy.ts:3669](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3669)

Base64url SHA-256 of the borrower's verifier.

---

### challengeMethod

> **challengeMethod**: `"S256"`

Defined in: [types/proxy.ts:3670](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3670)

---

### state

> **state**: `string`

Defined in: [types/proxy.ts:3672](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3672)

Borrower-chosen state, echoed through the authorization round trip.

---

### requestedAt

> **requestedAt**: `number`

Defined in: [types/proxy.ts:3673](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3673)

---

### expiresAt

> **expiresAt**: `number`

Defined in: [types/proxy.ts:3674](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3674)

---

### status

> **status**: [`ProxyShareProvisionStatus`](ProxyShareProvisionStatus.md)

Defined in: [types/proxy.ts:3675](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3675)

---

### code?

> `optional` **code?**: `string`

Defined in: [types/proxy.ts:3677](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3677)

Present only between authorization and the single claim that consumes it.

---

### authorizedAt?

> `optional` **authorizedAt?**: `number`

Defined in: [types/proxy.ts:3678](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3678)

---

### claimedAt?

> `optional` **claimedAt?**: `number`

Defined in: [types/proxy.ts:3679](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3679)

---

### accountLabel?

> `optional` **accountLabel?**: `string`

Defined in: [types/proxy.ts:3681](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3681)

Which of the lender's accounts was authorized, for the drift audit.
