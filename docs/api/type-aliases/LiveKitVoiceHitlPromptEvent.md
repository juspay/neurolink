[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LiveKitVoiceHitlPromptEvent

# Type Alias: LiveKitVoiceHitlPromptEvent

> **LiveKitVoiceHitlPromptEvent** = `object`

A human-in-the-loop confirmation the user must approve or reject.

## Properties

### type

> **type**: `"hitl-prompt"`

---

### data

> **data**: `object`

#### confirmationId

> **confirmationId**: `string`

#### toolName

> **toolName**: `string`

#### actionType?

> `optional` **actionType?**: `string`

#### arguments?

> `optional` **arguments?**: `unknown`

#### timeoutMs?

> `optional` **timeoutMs?**: `number`

#### allowModification?

> `optional` **allowModification?**: `boolean`
