[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClaudeResponse

# Type Alias: ClaudeResponse

> **ClaudeResponse** = `object`

Defined in: [types/proxy.ts:141](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/proxy.ts#L141)

Non-streaming response matching the Claude Messages API.

## Properties

### id

> **id**: `string`

Defined in: [types/proxy.ts:142](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/proxy.ts#L142)

---

### type

> **type**: `"message"`

Defined in: [types/proxy.ts:143](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/proxy.ts#L143)

---

### role

> **role**: `"assistant"`

Defined in: [types/proxy.ts:144](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/proxy.ts#L144)

---

### content

> **content**: [`ClaudeContentBlock`](ClaudeContentBlock.md)[]

Defined in: [types/proxy.ts:145](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/proxy.ts#L145)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:146](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/proxy.ts#L146)

---

### stop_reason

> **stop_reason**: `string` \| `null`

Defined in: [types/proxy.ts:147](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/proxy.ts#L147)

---

### stop_sequence

> **stop_sequence**: `string` \| `null`

Defined in: [types/proxy.ts:148](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/proxy.ts#L148)

---

### usage

> **usage**: [`ClaudeUsage`](ClaudeUsage.md)

Defined in: [types/proxy.ts:149](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/proxy.ts#L149)
