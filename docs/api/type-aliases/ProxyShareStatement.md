[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareStatement

# Type Alias: ProxyShareStatement

> **ProxyShareStatement** = `object`

Defined in: [types/proxy.ts:3757](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3757)

What a borrower makes of the receipts it collected.

## Properties

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:3758](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3758)

---

### receipts

> **receipts**: `number`

Defined in: [types/proxy.ts:3759](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3759)

---

### coins

> **coins**: `number`

Defined in: [types/proxy.ts:3760](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3760)

---

### unverified

> **unverified**: `number`

Defined in: [types/proxy.ts:3762](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3762)

Receipts whose signature did not verify against the shared secret.

---

### miscounted

> **miscounted**: `number`

Defined in: [types/proxy.ts:3764](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3764)

Receipts whose coin figure disagrees with its own usage block.

---

### gaps

> **gaps**: `number`[]

Defined in: [types/proxy.ts:3766](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3766)

Sequence numbers missing from an otherwise contiguous run.

---

### latestSequence

> **latestSequence**: `number`

Defined in: [types/proxy.ts:3767](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3767)
