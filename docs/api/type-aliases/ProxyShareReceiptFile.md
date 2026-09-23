[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareReceiptFile

# Type Alias: ProxyShareReceiptFile

> **ProxyShareReceiptFile** = `object`

Defined in: [types/proxy.ts:4309](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4309)

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:4310](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4310)

---

### receipts

> **receipts**: `Record`\<`string`, [`ProxyShareReceipt`](ProxyShareReceipt.md)[]\>

Defined in: [types/proxy.ts:4312](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4312)

Per grant, oldest first, bounded.

---

### netted

> **netted**: `Record`\<`string`, `number`\>

Defined in: [types/proxy.ts:4314](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4314)

Cumulative coins each grant has had forgiven by netting.

---

### consumedTotal?

> `optional` **consumedTotal?**: `Record`\<`string`, `number`\>

Defined in: [types/proxy.ts:4321](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4321)

Lifetime coins receipted per grant.

Kept separately because `receipts` is trimmed: summing the retained history
would quietly under-count a busy grant, and netting reads this number.

---

### highestSequence?

> `optional` **highestSequence?**: `Record`\<`string`, `number`\>

Defined in: [types/proxy.ts:4329](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4329)

Highest sequence issued per grant, for the same reason.

Taking it from the retained tail is right only until the tail is trimmed
away, and a sequence that restarts would look like a replay to the
borrower's audit.
