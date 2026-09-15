[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareProvisionRequest

# Type Alias: ProxyShareProvisionRequest

> **ProxyShareProvisionRequest** = `object`

Defined in: [types/proxy.ts:4009](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4009)

One borrower's outstanding request for a resident credential.

Holds the challenge, never a verifier and never a token — the lender is not
in a position to leak what it does not have. `code` exists only between the
lender authorizing and the borrower claiming, and is erased by consumption.

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:4010](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4010)

---

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:4011](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4011)

---

### codeChallenge

> **codeChallenge**: `string`

Defined in: [types/proxy.ts:4013](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4013)

Base64url SHA-256 of the borrower's verifier.

---

### challengeMethod

> **challengeMethod**: `"S256"`

Defined in: [types/proxy.ts:4014](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4014)

---

### state

> **state**: `string`

Defined in: [types/proxy.ts:4016](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4016)

Borrower-chosen state, echoed through the authorization round trip.

---

### requestedAt

> **requestedAt**: `number`

Defined in: [types/proxy.ts:4017](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4017)

---

### expiresAt

> **expiresAt**: `number`

Defined in: [types/proxy.ts:4018](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4018)

---

### status

> **status**: [`ProxyShareProvisionStatus`](ProxyShareProvisionStatus.md)

Defined in: [types/proxy.ts:4019](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4019)

---

### code?

> `optional` **code?**: `string`

Defined in: [types/proxy.ts:4021](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4021)

Present only between authorization and the single claim that consumes it.

---

### authorizedAt?

> `optional` **authorizedAt?**: `number`

Defined in: [types/proxy.ts:4022](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4022)

---

### claimedAt?

> `optional` **claimedAt?**: `number`

Defined in: [types/proxy.ts:4023](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4023)

---

### accountLabel?

> `optional` **accountLabel?**: `string`

Defined in: [types/proxy.ts:4025](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4025)

Which of the lender's accounts was authorized, for the drift audit.
