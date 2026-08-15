[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / LiveKitSttConfig

# Type Alias: LiveKitSttConfig

> **LiveKitSttConfig** = `object`

Defined in: [types/livekit.ts:77](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/livekit.ts#L77)

Speech-to-text plugin selection for the LiveKit worker.

## Properties

### provider

> **provider**: `string`

Defined in: [types/livekit.ts:78](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/livekit.ts#L78)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/livekit.ts:79](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/livekit.ts#L79)

---

### language?

> `optional` **language?**: `string`

Defined in: [types/livekit.ts:80](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/livekit.ts#L80)

---

### maxEndpointDelayMs?

> `optional` **maxEndpointDelayMs?**: `number`

Defined in: [types/livekit.ts:86](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/livekit.ts#L86)

Soniox only: maximum delay (ms) between speech cessation and the STT
endpoint. Raise it so Soniox does not finalize on short pauses — that lets
VAD silence (not the STT endpoint) decide when the turn ends.
