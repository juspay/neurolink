[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareStatement

# Type Alias: ProxyShareStatement

> **ProxyShareStatement** = `object`

Defined in: [types/proxy.ts:3956](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3956)

What a borrower makes of the receipts it collected.

## Properties

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:3957](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3957)

---

### receipts

> **receipts**: `number`

Defined in: [types/proxy.ts:3958](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3958)

---

### coins

> **coins**: `number`

Defined in: [types/proxy.ts:3959](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3959)

---

### unverified

> **unverified**: `number`

Defined in: [types/proxy.ts:3961](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3961)

Receipts whose signature did not verify against the shared secret.

---

### miscounted

> **miscounted**: `number`

Defined in: [types/proxy.ts:3963](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3963)

Receipts whose coin figure disagrees with its own usage block.

---

### gaps

> **gaps**: `number`[]

Defined in: [types/proxy.ts:3965](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3965)

Sequence numbers missing from an otherwise contiguous run.

---

### latestSequence

> **latestSequence**: `number`

Defined in: [types/proxy.ts:3966](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3966)
