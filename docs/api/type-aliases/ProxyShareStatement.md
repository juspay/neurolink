[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareStatement

# Type Alias: ProxyShareStatement

> **ProxyShareStatement** = `object`

Defined in: [types/proxy.ts:4426](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4426)

What a borrower makes of the receipts it collected.

## Properties

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:4427](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4427)

---

### receipts

> **receipts**: `number`

Defined in: [types/proxy.ts:4428](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4428)

---

### coins

> **coins**: `number`

Defined in: [types/proxy.ts:4429](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4429)

---

### unverified

> **unverified**: `number`

Defined in: [types/proxy.ts:4431](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4431)

Receipts whose signature did not verify against the shared secret.

---

### miscounted

> **miscounted**: `number`

Defined in: [types/proxy.ts:4433](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4433)

Receipts whose coin figure disagrees with its own usage block.

---

### gaps

> **gaps**: `number`[]

Defined in: [types/proxy.ts:4435](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4435)

Sequence numbers missing from an otherwise contiguous run.

---

### latestSequence

> **latestSequence**: `number`

Defined in: [types/proxy.ts:4436](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4436)
