[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareProvisionRequest

# Type Alias: ProxyShareProvisionRequest

> **ProxyShareProvisionRequest** = `object`

Defined in: [types/proxy.ts:4281](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4281)

One borrower's outstanding request for a resident credential.

Holds the challenge, never a verifier and never a token — the lender is not
in a position to leak what it does not have. `code` exists only between the
lender authorizing and the borrower claiming, and is erased by consumption.

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:4282](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4282)

---

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:4283](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4283)

---

### codeChallenge

> **codeChallenge**: `string`

Defined in: [types/proxy.ts:4285](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4285)

Base64url SHA-256 of the borrower's verifier.

---

### challengeMethod

> **challengeMethod**: `"S256"`

Defined in: [types/proxy.ts:4286](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4286)

---

### state

> **state**: `string`

Defined in: [types/proxy.ts:4288](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4288)

Borrower-chosen state, echoed through the authorization round trip.

---

### requestedAt

> **requestedAt**: `number`

Defined in: [types/proxy.ts:4289](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4289)

---

### expiresAt

> **expiresAt**: `number`

Defined in: [types/proxy.ts:4290](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4290)

---

### status

> **status**: [`ProxyShareProvisionStatus`](ProxyShareProvisionStatus.md)

Defined in: [types/proxy.ts:4291](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4291)

---

### code?

> `optional` **code?**: `string`

Defined in: [types/proxy.ts:4293](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4293)

Present only between authorization and the single claim that consumes it.

---

### authorizedAt?

> `optional` **authorizedAt?**: `number`

Defined in: [types/proxy.ts:4294](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4294)

---

### claimedAt?

> `optional` **claimedAt?**: `number`

Defined in: [types/proxy.ts:4295](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4295)

---

### accountLabel?

> `optional` **accountLabel?**: `string`

Defined in: [types/proxy.ts:4297](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4297)

Which of the lender's accounts was authorized, for the drift audit.
