[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareProvisionRequest

# Type Alias: ProxyShareProvisionRequest

> **ProxyShareProvisionRequest** = `object`

Defined in: [types/proxy.ts:3656](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3656)

One borrower's outstanding request for a resident credential.

Holds the challenge, never a verifier and never a token — the lender is not
in a position to leak what it does not have. `code` exists only between the
lender authorizing and the borrower claiming, and is erased by consumption.

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:3657](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3657)

---

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:3658](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3658)

---

### codeChallenge

> **codeChallenge**: `string`

Defined in: [types/proxy.ts:3660](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3660)

Base64url SHA-256 of the borrower's verifier.

---

### challengeMethod

> **challengeMethod**: `"S256"`

Defined in: [types/proxy.ts:3661](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3661)

---

### state

> **state**: `string`

Defined in: [types/proxy.ts:3663](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3663)

Borrower-chosen state, echoed through the authorization round trip.

---

### requestedAt

> **requestedAt**: `number`

Defined in: [types/proxy.ts:3664](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3664)

---

### expiresAt

> **expiresAt**: `number`

Defined in: [types/proxy.ts:3665](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3665)

---

### status

> **status**: [`ProxyShareProvisionStatus`](ProxyShareProvisionStatus.md)

Defined in: [types/proxy.ts:3666](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3666)

---

### code?

> `optional` **code?**: `string`

Defined in: [types/proxy.ts:3668](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3668)

Present only between authorization and the single claim that consumes it.

---

### authorizedAt?

> `optional` **authorizedAt?**: `number`

Defined in: [types/proxy.ts:3669](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3669)

---

### claimedAt?

> `optional` **claimedAt?**: `number`

Defined in: [types/proxy.ts:3670](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3670)

---

### accountLabel?

> `optional` **accountLabel?**: `string`

Defined in: [types/proxy.ts:3672](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3672)

Which of the lender's accounts was authorized, for the drift audit.
