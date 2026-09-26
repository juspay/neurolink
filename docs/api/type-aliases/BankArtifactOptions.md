[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / BankArtifactOptions

# Type Alias: BankArtifactOptions

> **BankArtifactOptions** = `object`

How to bank one payload. Only `kind` and `label` are required.

## Properties

### kind

> **kind**: [`BankedArtifactKind`](BankedArtifactKind.md)

What this payload is.

---

### label

> **label**: `string`

Short human label, e.g. "delegate:auth-review" — shown in logs.

---

### sessionId?

> `optional` **sessionId?**: `string`

Session the payload belongs to, recorded on the artifact metadata.

---

### contentType?

> `optional` **contentType?**: `"json"` \| `"text"`

Payload shape; decides the on-disk extension. Default "text".

---

### previewChars?

> `optional` **previewChars?**: `number`

Preview length in characters. Default 1000, hard cap 4000.
