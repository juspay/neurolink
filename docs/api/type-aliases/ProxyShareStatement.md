[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareStatement

# Type Alias: ProxyShareStatement

> **ProxyShareStatement** = `object`

Defined in: [types/proxy.ts:4488](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4488)

What a borrower makes of the receipts it collected.

## Properties

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:4489](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4489)

---

### receipts

> **receipts**: `number`

Defined in: [types/proxy.ts:4490](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4490)

---

### coins

> **coins**: `number`

Defined in: [types/proxy.ts:4491](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4491)

---

### unverified

> **unverified**: `number`

Defined in: [types/proxy.ts:4493](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4493)

Receipts whose signature did not verify against the shared secret.

---

### miscounted

> **miscounted**: `number`

Defined in: [types/proxy.ts:4495](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4495)

Receipts whose coin figure disagrees with its own usage block.

---

### gaps

> **gaps**: `number`[]

Defined in: [types/proxy.ts:4497](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4497)

Sequence numbers missing from an otherwise contiguous run.

---

### latestSequence

> **latestSequence**: `number`

Defined in: [types/proxy.ts:4498](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4498)
