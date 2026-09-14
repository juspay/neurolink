[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareStatement

# Type Alias: ProxyShareStatement

> **ProxyShareStatement** = `object`

Defined in: [types/proxy.ts:4067](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4067)

What a borrower makes of the receipts it collected.

## Properties

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:4068](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4068)

---

### receipts

> **receipts**: `number`

Defined in: [types/proxy.ts:4069](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4069)

---

### coins

> **coins**: `number`

Defined in: [types/proxy.ts:4070](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4070)

---

### unverified

> **unverified**: `number`

Defined in: [types/proxy.ts:4072](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4072)

Receipts whose signature did not verify against the shared secret.

---

### miscounted

> **miscounted**: `number`

Defined in: [types/proxy.ts:4074](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4074)

Receipts whose coin figure disagrees with its own usage block.

---

### gaps

> **gaps**: `number`[]

Defined in: [types/proxy.ts:4076](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4076)

Sequence numbers missing from an otherwise contiguous run.

---

### latestSequence

> **latestSequence**: `number`

Defined in: [types/proxy.ts:4077](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4077)
