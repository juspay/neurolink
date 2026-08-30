[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareStatement

# Type Alias: ProxyShareStatement

> **ProxyShareStatement** = `object`

Defined in: [types/proxy.ts:3706](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3706)

What a borrower makes of the receipts it collected.

## Properties

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:3707](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3707)

---

### receipts

> **receipts**: `number`

Defined in: [types/proxy.ts:3708](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3708)

---

### coins

> **coins**: `number`

Defined in: [types/proxy.ts:3709](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3709)

---

### unverified

> **unverified**: `number`

Defined in: [types/proxy.ts:3711](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3711)

Receipts whose signature did not verify against the shared secret.

---

### miscounted

> **miscounted**: `number`

Defined in: [types/proxy.ts:3713](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3713)

Receipts whose coin figure disagrees with its own usage block.

---

### gaps

> **gaps**: `number`[]

Defined in: [types/proxy.ts:3715](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3715)

Sequence numbers missing from an otherwise contiguous run.

---

### latestSequence

> **latestSequence**: `number`

Defined in: [types/proxy.ts:3716](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3716)
