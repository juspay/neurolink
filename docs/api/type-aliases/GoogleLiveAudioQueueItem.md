[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / GoogleLiveAudioQueueItem

# Type Alias: GoogleLiveAudioQueueItem

> **GoogleLiveAudioQueueItem** = \{ `type`: `"audio"`; `audio`: [`AudioChunk`](AudioChunk.md); \} \| \{ `type`: `"end"`; \} \| \{ `type`: `"error"`; `error`: `unknown`; \}

Defined in: [types/providers.ts:2357](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2357)

Event pushed through the Google AI Studio voice session's internal queue
while audio chunks stream back from the Gemini Live API.
