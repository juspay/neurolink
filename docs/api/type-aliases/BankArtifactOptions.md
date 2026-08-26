[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / BankArtifactOptions

# Type Alias: BankArtifactOptions

> **BankArtifactOptions** = `object`

Defined in: [types/artifact.ts:65](https://github.com/juspay/neurolink/blob/release/src/lib/types/artifact.ts#L65)

How to bank one payload. Only `kind` and `label` are required.

## Properties

### kind

> **kind**: [`BankedArtifactKind`](BankedArtifactKind.md)

Defined in: [types/artifact.ts:67](https://github.com/juspay/neurolink/blob/release/src/lib/types/artifact.ts#L67)

What this payload is.

---

### label

> **label**: `string`

Defined in: [types/artifact.ts:69](https://github.com/juspay/neurolink/blob/release/src/lib/types/artifact.ts#L69)

Short human label, e.g. "delegate:auth-review" — shown in logs.

---

### sessionId?

> `optional` **sessionId?**: `string`

Defined in: [types/artifact.ts:71](https://github.com/juspay/neurolink/blob/release/src/lib/types/artifact.ts#L71)

Session the payload belongs to, recorded on the artifact metadata.

---

### contentType?

> `optional` **contentType?**: `"json"` \| `"text"`

Defined in: [types/artifact.ts:73](https://github.com/juspay/neurolink/blob/release/src/lib/types/artifact.ts#L73)

Payload shape; decides the on-disk extension. Default "text".

---

### previewChars?

> `optional` **previewChars?**: `number`

Defined in: [types/artifact.ts:75](https://github.com/juspay/neurolink/blob/release/src/lib/types/artifact.ts#L75)

Preview length in characters. Default 1000, hard cap 4000.
