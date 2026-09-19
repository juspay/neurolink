[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AgentMechanicalDigest

# Type Alias: AgentMechanicalDigest

> **AgentMechanicalDigest** = `object`

Defined in: [types/isolatedAgent.ts:442](https://github.com/juspay/neurolink/blob/release/src/lib/types/isolatedAgent.ts#L442)

Mechanical digest shape (delivery-guarantee fallback payload).

## Properties

### kind

> **kind**: `"mechanical-digest"`

Defined in: [types/isolatedAgent.ts:443](https://github.com/juspay/neurolink/blob/release/src/lib/types/isolatedAgent.ts#L443)

---

### toolsRun

> **toolsRun**: `Record`\<`string`, \{ `calls`: `number`; `ok`: `number`; `failed`: `number`; \}\>

Defined in: [types/isolatedAgent.ts:444](https://github.com/juspay/neurolink/blob/release/src/lib/types/isolatedAgent.ts#L444)

---

### excerpts

> **excerpts**: `object`[]

Defined in: [types/isolatedAgent.ts:445](https://github.com/juspay/neurolink/blob/release/src/lib/types/isolatedAgent.ts#L445)

#### toolName

> **toolName**: `string`

#### params

> **params**: `string`

#### resultText

> **resultText**: `string`
