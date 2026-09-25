[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareReceiptFile

# Type Alias: ProxyShareReceiptFile

> **ProxyShareReceiptFile** = `object`

Defined in: [types/proxy.ts:4402](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4402)

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:4403](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4403)

---

### receipts

> **receipts**: `Record`\<`string`, [`ProxyShareReceipt`](ProxyShareReceipt.md)[]\>

Defined in: [types/proxy.ts:4405](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4405)

Per grant, oldest first, bounded.

---

### netted

> **netted**: `Record`\<`string`, `number`\>

Defined in: [types/proxy.ts:4407](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4407)

Cumulative coins each grant has had forgiven by netting.

---

### consumedTotal?

> `optional` **consumedTotal?**: `Record`\<`string`, `number`\>

Defined in: [types/proxy.ts:4414](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4414)

Lifetime coins receipted per grant.

Kept separately because `receipts` is trimmed: summing the retained history
would quietly under-count a busy grant, and netting reads this number.

---

### highestSequence?

> `optional` **highestSequence?**: `Record`\<`string`, `number`\>

Defined in: [types/proxy.ts:4422](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4422)

Highest sequence issued per grant, for the same reason.

Taking it from the retained tail is right only until the tail is trimmed
away, and a sequence that restarts would look like a replay to the
borrower's audit.
