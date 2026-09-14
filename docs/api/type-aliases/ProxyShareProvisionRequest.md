[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareProvisionRequest

# Type Alias: ProxyShareProvisionRequest

> **ProxyShareProvisionRequest** = `object`

Defined in: [types/proxy.ts:3995](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3995)

One borrower's outstanding request for a resident credential.

Holds the challenge, never a verifier and never a token — the lender is not
in a position to leak what it does not have. `code` exists only between the
lender authorizing and the borrower claiming, and is erased by consumption.

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:3996](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3996)

---

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:3997](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3997)

---

### codeChallenge

> **codeChallenge**: `string`

Defined in: [types/proxy.ts:3999](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3999)

Base64url SHA-256 of the borrower's verifier.

---

### challengeMethod

> **challengeMethod**: `"S256"`

Defined in: [types/proxy.ts:4000](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4000)

---

### state

> **state**: `string`

Defined in: [types/proxy.ts:4002](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4002)

Borrower-chosen state, echoed through the authorization round trip.

---

### requestedAt

> **requestedAt**: `number`

Defined in: [types/proxy.ts:4003](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4003)

---

### expiresAt

> **expiresAt**: `number`

Defined in: [types/proxy.ts:4004](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4004)

---

### status

> **status**: [`ProxyShareProvisionStatus`](ProxyShareProvisionStatus.md)

Defined in: [types/proxy.ts:4005](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4005)

---

### code?

> `optional` **code?**: `string`

Defined in: [types/proxy.ts:4007](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4007)

Present only between authorization and the single claim that consumes it.

---

### authorizedAt?

> `optional` **authorizedAt?**: `number`

Defined in: [types/proxy.ts:4008](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4008)

---

### claimedAt?

> `optional` **claimedAt?**: `number`

Defined in: [types/proxy.ts:4009](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4009)

---

### accountLabel?

> `optional` **accountLabel?**: `string`

Defined in: [types/proxy.ts:4011](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4011)

Which of the lender's accounts was authorized, for the drift audit.
