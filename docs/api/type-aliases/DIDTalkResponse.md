[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / DIDTalkResponse

# Type Alias: DIDTalkResponse

> **DIDTalkResponse** = `object`

Defined in: [types/avatar.ts:156](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/avatar.ts#L156)

D-ID `/talks` API response shape.

Used by `DIDAvatar` handler to type-check upstream responses. Lives here
(in `src/lib/types/`) per CLAUDE.md rule 2; the handler imports it via
the types barrel.

## Properties

### id

> **id**: `string`

Defined in: [types/avatar.ts:157](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/avatar.ts#L157)

---

### status?

> `optional` **status?**: `string`

Defined in: [types/avatar.ts:158](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/avatar.ts#L158)

---

### result_url?

> `optional` **result_url?**: `string`

Defined in: [types/avatar.ts:159](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/avatar.ts#L159)

---

### error?

> `optional` **error?**: `object`

Defined in: [types/avatar.ts:160](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/avatar.ts#L160)

#### kind?

> `optional` **kind?**: `string`

#### description?

> `optional` **description?**: `string`

---

### duration?

> `optional` **duration?**: `number`

Defined in: [types/avatar.ts:161](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/avatar.ts#L161)
