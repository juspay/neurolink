[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyIRRequest

# Type Alias: ProxyIRRequest

> **ProxyIRRequest** = `object`

## Properties

### sourceFormat

> **sourceFormat**: [`ProxyIRWireFormat`](ProxyIRWireFormat.md)

---

### sourceModel

> **sourceModel**: `string`

---

### originSessionId?

> `optional` **originSessionId?**: `string`

---

### originThreadId?

> `optional` **originThreadId?**: `string`

---

### messages

> **messages**: [`ProxyIRMessage`](ProxyIRMessage.md)[]

---

### tools

> **tools**: [`ProxyIRToolDeclaration`](ProxyIRToolDeclaration.md)[]

---

### toolChoice?

> `optional` **toolChoice?**: [`ProxyIRToolChoice`](ProxyIRToolChoice.md)

---

### reasoning

> **reasoning**: [`ProxyIRReasoning`](ProxyIRReasoning.md)

---

### stream

> **stream**: `boolean`

---

### promptCachePrefixKey?

> `optional` **promptCachePrefixKey?**: `string`

Prefix-derived routing hint. Never serialized onto any wire.
