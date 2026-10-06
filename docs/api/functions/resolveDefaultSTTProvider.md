[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / resolveDefaultSTTProvider

# Function: resolveDefaultSTTProvider()

> **resolveDefaultSTTProvider**(`credentials?`): `string`

The provider a transcription without an explicit one goes to:
`NEUROLINK_STT_PROVIDER` when it names a known provider or alias, else the
first configured provider in descriptor order, else the built-in local
engine. Never throws, never returns an empty string.

## Parameters

### credentials?

[`STTCredentials`](../type-aliases/STTCredentials.md)

## Returns

`string`
