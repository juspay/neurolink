[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LiveConnectConfig

# Type Alias: LiveConnectConfig

> **LiveConnectConfig** = `object`

Defined in: [types/providers.ts:1174](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1174)

Live connection configuration

## Properties

### model

> **model**: `string`

Defined in: [types/providers.ts:1175](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1175)

---

### callbacks

> **callbacks**: [`LiveConnectCallbacks`](LiveConnectCallbacks.md)

Defined in: [types/providers.ts:1176](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1176)

---

### config

> **config**: `object`

Defined in: [types/providers.ts:1177](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1177)

#### responseModalities

> **responseModalities**: (`"TEXT"` \| `"IMAGE"` \| `"AUDIO"`)[]

#### speechConfig

> **speechConfig**: `object`

##### speechConfig.voiceConfig

> **voiceConfig**: `object`

##### speechConfig.voiceConfig.prebuiltVoiceConfig

> **prebuiltVoiceConfig**: `object`

##### speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName

> **voiceName**: `string`
