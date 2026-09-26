[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareStatement

# Type Alias: ProxyShareStatement

> **ProxyShareStatement** = `object`

What a borrower makes of the receipts it collected.

## Properties

### grantId

> **grantId**: `string`

---

### receipts

> **receipts**: `number`

---

### coins

> **coins**: `number`

---

### unverified

> **unverified**: `number`

Receipts whose signature did not verify against the shared secret.

---

### miscounted

> **miscounted**: `number`

Receipts whose coin figure disagrees with its own usage block.

---

### gaps

> **gaps**: `number`[]

Sequence numbers missing from an otherwise contiguous run.

---

### latestSequence

> **latestSequence**: `number`
