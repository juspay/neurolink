[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareStatement

# Type Alias: ProxyShareStatement

> **ProxyShareStatement** = `object`

Defined in: [types/proxy.ts:3743](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3743)

What a borrower makes of the receipts it collected.

## Properties

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:3744](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3744)

---

### receipts

> **receipts**: `number`

Defined in: [types/proxy.ts:3745](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3745)

---

### coins

> **coins**: `number`

Defined in: [types/proxy.ts:3746](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3746)

---

### unverified

> **unverified**: `number`

Defined in: [types/proxy.ts:3748](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3748)

Receipts whose signature did not verify against the shared secret.

---

### miscounted

> **miscounted**: `number`

Defined in: [types/proxy.ts:3750](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3750)

Receipts whose coin figure disagrees with its own usage block.

---

### gaps

> **gaps**: `number`[]

Defined in: [types/proxy.ts:3752](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3752)

Sequence numbers missing from an otherwise contiguous run.

---

### latestSequence

> **latestSequence**: `number`

Defined in: [types/proxy.ts:3753](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3753)
