[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareProvisionRequest

# Type Alias: ProxyShareProvisionRequest

> **ProxyShareProvisionRequest** = `object`

Defined in: [types/proxy.ts:4164](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4164)

One borrower's outstanding request for a resident credential.

Holds the challenge, never a verifier and never a token — the lender is not
in a position to leak what it does not have. `code` exists only between the
lender authorizing and the borrower claiming, and is erased by consumption.

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:4165](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4165)

---

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:4166](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4166)

---

### codeChallenge

> **codeChallenge**: `string`

Defined in: [types/proxy.ts:4168](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4168)

Base64url SHA-256 of the borrower's verifier.

---

### challengeMethod

> **challengeMethod**: `"S256"`

Defined in: [types/proxy.ts:4169](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4169)

---

### state

> **state**: `string`

Defined in: [types/proxy.ts:4171](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4171)

Borrower-chosen state, echoed through the authorization round trip.

---

### requestedAt

> **requestedAt**: `number`

Defined in: [types/proxy.ts:4172](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4172)

---

### expiresAt

> **expiresAt**: `number`

Defined in: [types/proxy.ts:4173](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4173)

---

### status

> **status**: [`ProxyShareProvisionStatus`](ProxyShareProvisionStatus.md)

Defined in: [types/proxy.ts:4174](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4174)

---

### code?

> `optional` **code?**: `string`

Defined in: [types/proxy.ts:4176](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4176)

Present only between authorization and the single claim that consumes it.

---

### authorizedAt?

> `optional` **authorizedAt?**: `number`

Defined in: [types/proxy.ts:4177](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4177)

---

### claimedAt?

> `optional` **claimedAt?**: `number`

Defined in: [types/proxy.ts:4178](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4178)

---

### accountLabel?

> `optional` **accountLabel?**: `string`

Defined in: [types/proxy.ts:4180](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4180)

Which of the lender's accounts was authorized, for the drift audit.
