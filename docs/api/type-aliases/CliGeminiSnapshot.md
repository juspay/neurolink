[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CliGeminiSnapshot

# Type Alias: CliGeminiSnapshot

> **CliGeminiSnapshot** = `object`

Defined in: [types/proxyClient.ts:74](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L74)

Snapshot of the user's pre-existing Gemini CLI `~/.gemini/.env`.

The whole file is kept rather than the managed keys alone: restoring must
reproduce the user's comments, ordering and unrelated variables exactly.

## Properties

### originalEnv

> **originalEnv**: `string` \| `null`

Defined in: [types/proxyClient.ts:76](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L76)

The whole prior `.env`, or null when the user had no such file.

---

### written?

> `optional` **written?**: `object`

Defined in: [types/proxyClient.ts:83](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L83)

What the writer last wrote for each managed variable. Compared against the
file on disk to detect a snapshot that has gone stale — one left behind by
a restore whose cleanup failed, or overtaken by a user edit. Reusing such a
record would make the next restore replay outdated values.

#### baseUrl

> **baseUrl**: `string`

#### apiKey

> **apiKey**: `string`
