[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AgentMechanicalDigest

# Type Alias: AgentMechanicalDigest

> **AgentMechanicalDigest** = `object`

Mechanical digest shape (delivery-guarantee fallback payload).

## Properties

### kind

> **kind**: `"mechanical-digest"`

---

### toolsRun

> **toolsRun**: `Record`\<`string`, \{ `calls`: `number`; `ok`: `number`; `failed`: `number`; \}\>

---

### excerpts

> **excerpts**: `object`[]

#### toolName

> **toolName**: `string`

#### params

> **params**: `string`

#### resultText

> **resultText**: `string`
