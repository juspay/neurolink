[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareStatement

# Type Alias: ProxyShareStatement

> **ProxyShareStatement** = `object`

Defined in: [types/proxy.ts:4333](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4333)

What a borrower makes of the receipts it collected.

## Properties

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:4334](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4334)

---

### receipts

> **receipts**: `number`

Defined in: [types/proxy.ts:4335](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4335)

---

### coins

> **coins**: `number`

Defined in: [types/proxy.ts:4336](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4336)

---

### unverified

> **unverified**: `number`

Defined in: [types/proxy.ts:4338](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4338)

Receipts whose signature did not verify against the shared secret.

---

### miscounted

> **miscounted**: `number`

Defined in: [types/proxy.ts:4340](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4340)

Receipts whose coin figure disagrees with its own usage block.

---

### gaps

> **gaps**: `number`[]

Defined in: [types/proxy.ts:4342](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4342)

Sequence numbers missing from an otherwise contiguous run.

---

### latestSequence

> **latestSequence**: `number`

Defined in: [types/proxy.ts:4343](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4343)
