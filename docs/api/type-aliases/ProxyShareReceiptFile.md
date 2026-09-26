[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareReceiptFile

# Type Alias: ProxyShareReceiptFile

> **ProxyShareReceiptFile** = `object`

## Properties

### schemaVersion

> **schemaVersion**: `1`

---

### receipts

> **receipts**: `Record`\<`string`, [`ProxyShareReceipt`](ProxyShareReceipt.md)[]\>

Per grant, oldest first, bounded.

---

### netted

> **netted**: `Record`\<`string`, `number`\>

Cumulative coins each grant has had forgiven by netting.

---

### consumedTotal?

> `optional` **consumedTotal?**: `Record`\<`string`, `number`\>

Lifetime coins receipted per grant.

Kept separately because `receipts` is trimmed: summing the retained history
would quietly under-count a busy grant, and netting reads this number.

---

### highestSequence?

> `optional` **highestSequence?**: `Record`\<`string`, `number`\>

Highest sequence issued per grant, for the same reason.

Taking it from the retained tail is right only until the tail is trimmed
away, and a sequence that restarts would look like a replay to the
borrower's audit.
