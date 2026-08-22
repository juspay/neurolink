[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / normalizeText

# Function: normalizeText()

> **normalizeText**(`input`): `string`

Defined in: [knowledge/normalize.ts:37](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/knowledge/normalize.ts#L37)

Normalize an arbitrary string into a single space-delimited lowercase
phrase. Idempotent: `normalizeText(normalizeText(x)) === normalizeText(x)`.

## Parameters

### input

`string`

## Returns

`string`
