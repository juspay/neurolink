[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareProvisionRequest

# Type Alias: ProxyShareProvisionRequest

> **ProxyShareProvisionRequest** = `object`

Defined in: [types/proxy.ts:4261](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4261)

One borrower's outstanding request for a resident credential.

Holds the challenge, never a verifier and never a token — the lender is not
in a position to leak what it does not have. `code` exists only between the
lender authorizing and the borrower claiming, and is erased by consumption.

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:4262](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4262)

---

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:4263](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4263)

---

### codeChallenge

> **codeChallenge**: `string`

Defined in: [types/proxy.ts:4265](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4265)

Base64url SHA-256 of the borrower's verifier.

---

### challengeMethod

> **challengeMethod**: `"S256"`

Defined in: [types/proxy.ts:4266](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4266)

---

### state

> **state**: `string`

Defined in: [types/proxy.ts:4268](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4268)

Borrower-chosen state, echoed through the authorization round trip.

---

### requestedAt

> **requestedAt**: `number`

Defined in: [types/proxy.ts:4269](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4269)

---

### expiresAt

> **expiresAt**: `number`

Defined in: [types/proxy.ts:4270](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4270)

---

### status

> **status**: [`ProxyShareProvisionStatus`](ProxyShareProvisionStatus.md)

Defined in: [types/proxy.ts:4271](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4271)

---

### code?

> `optional` **code?**: `string`

Defined in: [types/proxy.ts:4273](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4273)

Present only between authorization and the single claim that consumes it.

---

### authorizedAt?

> `optional` **authorizedAt?**: `number`

Defined in: [types/proxy.ts:4274](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4274)

---

### claimedAt?

> `optional` **claimedAt?**: `number`

Defined in: [types/proxy.ts:4275](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4275)

---

### accountLabel?

> `optional` **accountLabel?**: `string`

Defined in: [types/proxy.ts:4277](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4277)

Which of the lender's accounts was authorized, for the drift audit.
