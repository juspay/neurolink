[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareStatement

# Type Alias: ProxyShareStatement

> **ProxyShareStatement** = `object`

Defined in: [types/proxy.ts:4478](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4478)

What a borrower makes of the receipts it collected.

## Properties

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:4479](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4479)

---

### receipts

> **receipts**: `number`

Defined in: [types/proxy.ts:4480](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4480)

---

### coins

> **coins**: `number`

Defined in: [types/proxy.ts:4481](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4481)

---

### unverified

> **unverified**: `number`

Defined in: [types/proxy.ts:4483](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4483)

Receipts whose signature did not verify against the shared secret.

---

### miscounted

> **miscounted**: `number`

Defined in: [types/proxy.ts:4485](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4485)

Receipts whose coin figure disagrees with its own usage block.

---

### gaps

> **gaps**: `number`[]

Defined in: [types/proxy.ts:4487](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4487)

Sequence numbers missing from an otherwise contiguous run.

---

### latestSequence

> **latestSequence**: `number`

Defined in: [types/proxy.ts:4488](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4488)
