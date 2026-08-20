[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareStatement

# Type Alias: ProxyShareStatement

> **ProxyShareStatement** = `object`

Defined in: [types/proxy.ts:3636](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3636)

What a borrower makes of the receipts it collected.

## Properties

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:3637](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3637)

---

### receipts

> **receipts**: `number`

Defined in: [types/proxy.ts:3638](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3638)

---

### coins

> **coins**: `number`

Defined in: [types/proxy.ts:3639](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3639)

---

### unverified

> **unverified**: `number`

Defined in: [types/proxy.ts:3641](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3641)

Receipts whose signature did not verify against the shared secret.

---

### miscounted

> **miscounted**: `number`

Defined in: [types/proxy.ts:3643](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3643)

Receipts whose coin figure disagrees with its own usage block.

---

### gaps

> **gaps**: `number`[]

Defined in: [types/proxy.ts:3645](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3645)

Sequence numbers missing from an otherwise contiguous run.

---

### latestSequence

> **latestSequence**: `number`

Defined in: [types/proxy.ts:3646](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3646)
