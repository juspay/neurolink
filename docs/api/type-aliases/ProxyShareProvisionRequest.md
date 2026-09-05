[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareProvisionRequest

# Type Alias: ProxyShareProvisionRequest

> **ProxyShareProvisionRequest** = `object`

Defined in: [types/proxy.ts:3685](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3685)

One borrower's outstanding request for a resident credential.

Holds the challenge, never a verifier and never a token — the lender is not
in a position to leak what it does not have. `code` exists only between the
lender authorizing and the borrower claiming, and is erased by consumption.

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:3686](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3686)

---

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:3687](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3687)

---

### codeChallenge

> **codeChallenge**: `string`

Defined in: [types/proxy.ts:3689](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3689)

Base64url SHA-256 of the borrower's verifier.

---

### challengeMethod

> **challengeMethod**: `"S256"`

Defined in: [types/proxy.ts:3690](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3690)

---

### state

> **state**: `string`

Defined in: [types/proxy.ts:3692](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3692)

Borrower-chosen state, echoed through the authorization round trip.

---

### requestedAt

> **requestedAt**: `number`

Defined in: [types/proxy.ts:3693](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3693)

---

### expiresAt

> **expiresAt**: `number`

Defined in: [types/proxy.ts:3694](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3694)

---

### status

> **status**: [`ProxyShareProvisionStatus`](ProxyShareProvisionStatus.md)

Defined in: [types/proxy.ts:3695](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3695)

---

### code?

> `optional` **code?**: `string`

Defined in: [types/proxy.ts:3697](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3697)

Present only between authorization and the single claim that consumes it.

---

### authorizedAt?

> `optional` **authorizedAt?**: `number`

Defined in: [types/proxy.ts:3698](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3698)

---

### claimedAt?

> `optional` **claimedAt?**: `number`

Defined in: [types/proxy.ts:3699](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3699)

---

### accountLabel?

> `optional` **accountLabel?**: `string`

Defined in: [types/proxy.ts:3701](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3701)

Which of the lender's accounts was authorized, for the drift audit.
