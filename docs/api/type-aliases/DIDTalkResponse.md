[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DIDTalkResponse

# Type Alias: DIDTalkResponse

> **DIDTalkResponse** = `object`

D-ID `/talks` API response shape.

Used by `DIDAvatar` handler to type-check upstream responses. Lives here
(in `src/lib/types/`) per CLAUDE.md rule 2; the handler imports it via
the types barrel.

## Properties

### id

> **id**: `string`

---

### status?

> `optional` **status?**: `string`

---

### result_url?

> `optional` **result_url?**: `string`

---

### error?

> `optional` **error?**: `object`

#### kind?

> `optional` **kind?**: `string`

#### description?

> `optional` **description?**: `string`

---

### duration?

> `optional` **duration?**: `number`
