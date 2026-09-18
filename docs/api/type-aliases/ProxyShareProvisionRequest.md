[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareProvisionRequest

# Type Alias: ProxyShareProvisionRequest

> **ProxyShareProvisionRequest** = `object`

Defined in: [types/proxy.ts:4034](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4034)

One borrower's outstanding request for a resident credential.

Holds the challenge, never a verifier and never a token — the lender is not
in a position to leak what it does not have. `code` exists only between the
lender authorizing and the borrower claiming, and is erased by consumption.

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:4035](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4035)

---

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:4036](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4036)

---

### codeChallenge

> **codeChallenge**: `string`

Defined in: [types/proxy.ts:4038](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4038)

Base64url SHA-256 of the borrower's verifier.

---

### challengeMethod

> **challengeMethod**: `"S256"`

Defined in: [types/proxy.ts:4039](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4039)

---

### state

> **state**: `string`

Defined in: [types/proxy.ts:4041](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4041)

Borrower-chosen state, echoed through the authorization round trip.

---

### requestedAt

> **requestedAt**: `number`

Defined in: [types/proxy.ts:4042](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4042)

---

### expiresAt

> **expiresAt**: `number`

Defined in: [types/proxy.ts:4043](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4043)

---

### status

> **status**: [`ProxyShareProvisionStatus`](ProxyShareProvisionStatus.md)

Defined in: [types/proxy.ts:4044](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4044)

---

### code?

> `optional` **code?**: `string`

Defined in: [types/proxy.ts:4046](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4046)

Present only between authorization and the single claim that consumes it.

---

### authorizedAt?

> `optional` **authorizedAt?**: `number`

Defined in: [types/proxy.ts:4047](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4047)

---

### claimedAt?

> `optional` **claimedAt?**: `number`

Defined in: [types/proxy.ts:4048](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4048)

---

### accountLabel?

> `optional` **accountLabel?**: `string`

Defined in: [types/proxy.ts:4050](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4050)

Which of the lender's accounts was authorized, for the drift audit.
