[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareReceiptFile

# Type Alias: ProxyShareReceiptFile

> **ProxyShareReceiptFile** = `object`

Defined in: [types/proxy.ts:4082](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4082)

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:4083](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4083)

---

### receipts

> **receipts**: `Record`\<`string`, [`ProxyShareReceipt`](ProxyShareReceipt.md)[]\>

Defined in: [types/proxy.ts:4085](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4085)

Per grant, oldest first, bounded.

---

### netted

> **netted**: `Record`\<`string`, `number`\>

Defined in: [types/proxy.ts:4087](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4087)

Cumulative coins each grant has had forgiven by netting.

---

### consumedTotal?

> `optional` **consumedTotal?**: `Record`\<`string`, `number`\>

Defined in: [types/proxy.ts:4094](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4094)

Lifetime coins receipted per grant.

Kept separately because `receipts` is trimmed: summing the retained history
would quietly under-count a busy grant, and netting reads this number.

---

### highestSequence?

> `optional` **highestSequence?**: `Record`\<`string`, `number`\>

Defined in: [types/proxy.ts:4102](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4102)

Highest sequence issued per grant, for the same reason.

Taking it from the retained tail is right only until the tail is trimmed
away, and a sequence that restarts would look like a replay to the
borrower's audit.
