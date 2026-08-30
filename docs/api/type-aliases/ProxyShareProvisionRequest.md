[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareProvisionRequest

# Type Alias: ProxyShareProvisionRequest

> **ProxyShareProvisionRequest** = `object`

Defined in: [types/proxy.ts:3634](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3634)

One borrower's outstanding request for a resident credential.

Holds the challenge, never a verifier and never a token — the lender is not
in a position to leak what it does not have. `code` exists only between the
lender authorizing and the borrower claiming, and is erased by consumption.

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:3635](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3635)

---

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:3636](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3636)

---

### codeChallenge

> **codeChallenge**: `string`

Defined in: [types/proxy.ts:3638](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3638)

Base64url SHA-256 of the borrower's verifier.

---

### challengeMethod

> **challengeMethod**: `"S256"`

Defined in: [types/proxy.ts:3639](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3639)

---

### state

> **state**: `string`

Defined in: [types/proxy.ts:3641](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3641)

Borrower-chosen state, echoed through the authorization round trip.

---

### requestedAt

> **requestedAt**: `number`

Defined in: [types/proxy.ts:3642](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3642)

---

### expiresAt

> **expiresAt**: `number`

Defined in: [types/proxy.ts:3643](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3643)

---

### status

> **status**: [`ProxyShareProvisionStatus`](ProxyShareProvisionStatus.md)

Defined in: [types/proxy.ts:3644](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3644)

---

### code?

> `optional` **code?**: `string`

Defined in: [types/proxy.ts:3646](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3646)

Present only between authorization and the single claim that consumes it.

---

### authorizedAt?

> `optional` **authorizedAt?**: `number`

Defined in: [types/proxy.ts:3647](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3647)

---

### claimedAt?

> `optional` **claimedAt?**: `number`

Defined in: [types/proxy.ts:3648](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3648)

---

### accountLabel?

> `optional` **accountLabel?**: `string`

Defined in: [types/proxy.ts:3650](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3650)

Which of the lender's accounts was authorized, for the drift audit.
