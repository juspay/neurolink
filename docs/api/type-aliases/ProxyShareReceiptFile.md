[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareReceiptFile

# Type Alias: ProxyShareReceiptFile

> **ProxyShareReceiptFile** = `object`

Defined in: [types/proxy.ts:3612](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3612)

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:3613](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3613)

---

### receipts

> **receipts**: `Record`\<`string`, [`ProxyShareReceipt`](ProxyShareReceipt.md)[]\>

Defined in: [types/proxy.ts:3615](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3615)

Per grant, oldest first, bounded.

---

### netted

> **netted**: `Record`\<`string`, `number`\>

Defined in: [types/proxy.ts:3617](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3617)

Cumulative coins each grant has had forgiven by netting.

---

### consumedTotal?

> `optional` **consumedTotal?**: `Record`\<`string`, `number`\>

Defined in: [types/proxy.ts:3624](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3624)

Lifetime coins receipted per grant.

Kept separately because `receipts` is trimmed: summing the retained history
would quietly under-count a busy grant, and netting reads this number.

---

### highestSequence?

> `optional` **highestSequence?**: `Record`\<`string`, `number`\>

Defined in: [types/proxy.ts:3632](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3632)

Highest sequence issued per grant, for the same reason.

Taking it from the retained tail is right only until the tail is trimmed
away, and a sequence that restarts would look like a replay to the
borrower's audit.
