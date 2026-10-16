[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ServerTranscribeCapabilities

# Type Alias: ServerTranscribeCapabilities

> **ServerTranscribeCapabilities** = `object`

What `GET /agent/transcribe/providers` reports: the engines this server
can transcribe with, which one a request without a provider gets, and the
models behind the correction layer. Never a key or a URL with a secret.

## Properties

### default

> **default**: `string`

The provider a request without one goes to.

---

### providers

> **providers**: `object`[]

#### name

> **name**: `string`

#### kind

> **kind**: `"builtin"` \| `"endpoint"` \| `"registered"`

`builtin` ships with NeuroLink, `endpoint` comes from `NEUROLINK_STT_ENDPOINTS`, `registered` was added at runtime.

#### model?

> `optional` **model?**: `string`

#### languageProbe?

> `optional` **languageProbe?**: `boolean`

The endpoint can answer a language verdict without transcribing (batch probe).

#### languagePrior?

> `optional` **languagePrior?**: `boolean`

The endpoint takes a language prior between utterances.

---

### correction

> **correction**: `object`

#### decision

> **decision**: \{ `provider`: `string`; `model`: `string`; \} \| `null`

The decision model that judges dictionary candidates; `null` when none is configured (the dictionary is then applied as is).

#### rewrite

> **rewrite**: `object`

The text model of the rewrite; `provider` is `null` when the instance default applies.

##### rewrite.provider

> **provider**: `string` \| `null`

##### rewrite.model

> **model**: `string` \| `null`
