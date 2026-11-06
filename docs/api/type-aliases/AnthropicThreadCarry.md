[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AnthropicThreadCarry

# Type Alias: AnthropicThreadCarry

> **AnthropicThreadCarry** = `object`

What one call hands the next call of the same session so it can continue the
thread instead of creating another: the last stored response, the fixed
fields the thread was created with, and a hash of each message the call
started from (the history conversation memory rebuilt for it).

## Properties

### previousMessageId

> **previousMessageId**: `string`

---

### fingerprint

> **fingerprint**: `string`

---

### anchor

> **anchor**: `string`[]
