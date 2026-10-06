[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / STTLocalAgreementState

# Type Alias: STTLocalAgreementState

> **STTLocalAgreementState** = `object`

LocalAgreement bookkeeping for one utterance.

## Properties

### prevWords

> **prevWords**: `string`[]

Words of the previous pass.

---

### committedWords

> **committedWords**: `string`[]

The committed words themselves; a later pass never rewrites them.

---

### committedN

> **committedN**: `number`

`committedWords.length`; never shrinks while the state lives.
