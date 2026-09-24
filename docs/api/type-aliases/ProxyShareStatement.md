[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareStatement

# Type Alias: ProxyShareStatement

> **ProxyShareStatement** = `object`

Defined in: [types/proxy.ts:4356](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4356)

What a borrower makes of the receipts it collected.

## Properties

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:4357](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4357)

---

### receipts

> **receipts**: `number`

Defined in: [types/proxy.ts:4358](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4358)

---

### coins

> **coins**: `number`

Defined in: [types/proxy.ts:4359](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4359)

---

### unverified

> **unverified**: `number`

Defined in: [types/proxy.ts:4361](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4361)

Receipts whose signature did not verify against the shared secret.

---

### miscounted

> **miscounted**: `number`

Defined in: [types/proxy.ts:4363](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4363)

Receipts whose coin figure disagrees with its own usage block.

---

### gaps

> **gaps**: `number`[]

Defined in: [types/proxy.ts:4365](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4365)

Sequence numbers missing from an otherwise contiguous run.

---

### latestSequence

> **latestSequence**: `number`

Defined in: [types/proxy.ts:4366](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4366)
