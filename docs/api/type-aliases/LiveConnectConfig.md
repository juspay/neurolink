[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LiveConnectConfig

# Type Alias: LiveConnectConfig

> **LiveConnectConfig** = `object`

Defined in: [types/providers.ts:1106](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1106)

Live connection configuration

## Properties

### model

> **model**: `string`

Defined in: [types/providers.ts:1107](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1107)

---

### callbacks

> **callbacks**: [`LiveConnectCallbacks`](LiveConnectCallbacks.md)

Defined in: [types/providers.ts:1108](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1108)

---

### config

> **config**: `object`

Defined in: [types/providers.ts:1109](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1109)

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
