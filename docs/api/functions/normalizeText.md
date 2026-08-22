[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / normalizeText

# Function: normalizeText()

> **normalizeText**(`input`): `string`

Defined in: [knowledge/normalize.ts:37](https://github.com/juspay/neurolink/blob/release/src/lib/knowledge/normalize.ts#L37)

Normalize an arbitrary string into a single space-delimited lowercase
phrase. Idempotent: `normalizeText(normalizeText(x)) === normalizeText(x)`.

## Parameters

### input

`string`

## Returns

`string`
