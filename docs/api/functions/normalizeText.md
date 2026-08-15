[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / normalizeText

# Function: normalizeText()

> **normalizeText**(`input`): `string`

Defined in: [knowledge/normalize.ts:37](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/knowledge/normalize.ts#L37)

Normalize an arbitrary string into a single space-delimited lowercase
phrase. Idempotent: `normalizeText(normalizeText(x)) === normalizeText(x)`.

## Parameters

### input

`string`

## Returns

`string`
