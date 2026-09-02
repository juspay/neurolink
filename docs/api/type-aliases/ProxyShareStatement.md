[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareStatement

# Type Alias: ProxyShareStatement

> **ProxyShareStatement** = `object`

Defined in: [types/proxy.ts:3737](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3737)

What a borrower makes of the receipts it collected.

## Properties

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:3738](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3738)

---

### receipts

> **receipts**: `number`

Defined in: [types/proxy.ts:3739](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3739)

---

### coins

> **coins**: `number`

Defined in: [types/proxy.ts:3740](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3740)

---

### unverified

> **unverified**: `number`

Defined in: [types/proxy.ts:3742](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3742)

Receipts whose signature did not verify against the shared secret.

---

### miscounted

> **miscounted**: `number`

Defined in: [types/proxy.ts:3744](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3744)

Receipts whose coin figure disagrees with its own usage block.

---

### gaps

> **gaps**: `number`[]

Defined in: [types/proxy.ts:3746](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3746)

Sequence numbers missing from an otherwise contiguous run.

---

### latestSequence

> **latestSequence**: `number`

Defined in: [types/proxy.ts:3747](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3747)
