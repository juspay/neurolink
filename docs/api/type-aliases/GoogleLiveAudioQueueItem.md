[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / GoogleLiveAudioQueueItem

# Type Alias: GoogleLiveAudioQueueItem

> **GoogleLiveAudioQueueItem** = \{ `type`: `"audio"`; `audio`: [`AudioChunk`](AudioChunk.md); \} \| \{ `type`: `"end"`; \} \| \{ `type`: `"error"`; `error`: `unknown`; \}

Defined in: [types/providers.ts:2322](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/providers.ts#L2322)

Event pushed through the Google AI Studio voice session's internal queue
while audio chunks stream back from the Gemini Live API.
