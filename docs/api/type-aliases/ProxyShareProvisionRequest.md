[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareProvisionRequest

# Type Alias: ProxyShareProvisionRequest

> **ProxyShareProvisionRequest** = `object`

Defined in: [types/proxy.ts:3884](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3884)

One borrower's outstanding request for a resident credential.

Holds the challenge, never a verifier and never a token — the lender is not
in a position to leak what it does not have. `code` exists only between the
lender authorizing and the borrower claiming, and is erased by consumption.

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:3885](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3885)

---

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:3886](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3886)

---

### codeChallenge

> **codeChallenge**: `string`

Defined in: [types/proxy.ts:3888](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3888)

Base64url SHA-256 of the borrower's verifier.

---

### challengeMethod

> **challengeMethod**: `"S256"`

Defined in: [types/proxy.ts:3889](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3889)

---

### state

> **state**: `string`

Defined in: [types/proxy.ts:3891](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3891)

Borrower-chosen state, echoed through the authorization round trip.

---

### requestedAt

> **requestedAt**: `number`

Defined in: [types/proxy.ts:3892](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3892)

---

### expiresAt

> **expiresAt**: `number`

Defined in: [types/proxy.ts:3893](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3893)

---

### status

> **status**: [`ProxyShareProvisionStatus`](ProxyShareProvisionStatus.md)

Defined in: [types/proxy.ts:3894](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3894)

---

### code?

> `optional` **code?**: `string`

Defined in: [types/proxy.ts:3896](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3896)

Present only between authorization and the single claim that consumes it.

---

### authorizedAt?

> `optional` **authorizedAt?**: `number`

Defined in: [types/proxy.ts:3897](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3897)

---

### claimedAt?

> `optional` **claimedAt?**: `number`

Defined in: [types/proxy.ts:3898](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3898)

---

### accountLabel?

> `optional` **accountLabel?**: `string`

Defined in: [types/proxy.ts:3900](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3900)

Which of the lender's accounts was authorized, for the drift audit.
