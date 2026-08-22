[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / AgentMechanicalDigest

# Type Alias: AgentMechanicalDigest

> **AgentMechanicalDigest** = `object`

Defined in: [types/isolatedAgent.ts:433](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/isolatedAgent.ts#L433)

Mechanical digest shape (delivery-guarantee fallback payload).

## Properties

### kind

> **kind**: `"mechanical-digest"`

Defined in: [types/isolatedAgent.ts:434](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/isolatedAgent.ts#L434)

---

### toolsRun

> **toolsRun**: `Record`\<`string`, \{ `calls`: `number`; `ok`: `number`; `failed`: `number`; \}\>

Defined in: [types/isolatedAgent.ts:435](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/isolatedAgent.ts#L435)

---

### excerpts

> **excerpts**: `object`[]

Defined in: [types/isolatedAgent.ts:436](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/isolatedAgent.ts#L436)

#### toolName

> **toolName**: `string`

#### params

> **params**: `string`

#### resultText

> **resultText**: `string`
