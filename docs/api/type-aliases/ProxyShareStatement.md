[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareStatement

# Type Alias: ProxyShareStatement

> **ProxyShareStatement** = `object`

Defined in: [types/proxy.ts:4353](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4353)

What a borrower makes of the receipts it collected.

## Properties

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:4354](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4354)

---

### receipts

> **receipts**: `number`

Defined in: [types/proxy.ts:4355](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4355)

---

### coins

> **coins**: `number`

Defined in: [types/proxy.ts:4356](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4356)

---

### unverified

> **unverified**: `number`

Defined in: [types/proxy.ts:4358](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4358)

Receipts whose signature did not verify against the shared secret.

---

### miscounted

> **miscounted**: `number`

Defined in: [types/proxy.ts:4360](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4360)

Receipts whose coin figure disagrees with its own usage block.

---

### gaps

> **gaps**: `number`[]

Defined in: [types/proxy.ts:4362](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4362)

Sequence numbers missing from an otherwise contiguous run.

---

### latestSequence

> **latestSequence**: `number`

Defined in: [types/proxy.ts:4363](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4363)
