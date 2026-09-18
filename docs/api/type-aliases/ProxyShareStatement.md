[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareStatement

# Type Alias: ProxyShareStatement

> **ProxyShareStatement** = `object`

Defined in: [types/proxy.ts:4106](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4106)

What a borrower makes of the receipts it collected.

## Properties

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:4107](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4107)

---

### receipts

> **receipts**: `number`

Defined in: [types/proxy.ts:4108](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4108)

---

### coins

> **coins**: `number`

Defined in: [types/proxy.ts:4109](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4109)

---

### unverified

> **unverified**: `number`

Defined in: [types/proxy.ts:4111](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4111)

Receipts whose signature did not verify against the shared secret.

---

### miscounted

> **miscounted**: `number`

Defined in: [types/proxy.ts:4113](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4113)

Receipts whose coin figure disagrees with its own usage block.

---

### gaps

> **gaps**: `number`[]

Defined in: [types/proxy.ts:4115](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4115)

Sequence numbers missing from an otherwise contiguous run.

---

### latestSequence

> **latestSequence**: `number`

Defined in: [types/proxy.ts:4116](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4116)
