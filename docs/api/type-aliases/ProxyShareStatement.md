[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareStatement

# Type Alias: ProxyShareStatement

> **ProxyShareStatement** = `object`

Defined in: [types/proxy.ts:3728](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3728)

What a borrower makes of the receipts it collected.

## Properties

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:3729](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3729)

---

### receipts

> **receipts**: `number`

Defined in: [types/proxy.ts:3730](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3730)

---

### coins

> **coins**: `number`

Defined in: [types/proxy.ts:3731](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3731)

---

### unverified

> **unverified**: `number`

Defined in: [types/proxy.ts:3733](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3733)

Receipts whose signature did not verify against the shared secret.

---

### miscounted

> **miscounted**: `number`

Defined in: [types/proxy.ts:3735](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3735)

Receipts whose coin figure disagrees with its own usage block.

---

### gaps

> **gaps**: `number`[]

Defined in: [types/proxy.ts:3737](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3737)

Sequence numbers missing from an otherwise contiguous run.

---

### latestSequence

> **latestSequence**: `number`

Defined in: [types/proxy.ts:3738](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3738)
