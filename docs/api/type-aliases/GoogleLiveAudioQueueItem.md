[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / GoogleLiveAudioQueueItem

# Type Alias: GoogleLiveAudioQueueItem

> **GoogleLiveAudioQueueItem** = \{ `type`: `"audio"`; `audio`: [`AudioChunk`](AudioChunk.md); \} \| \{ `type`: `"end"`; \} \| \{ `type`: `"error"`; `error`: `unknown`; \}

Defined in: [types/providers.ts:2284](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/providers.ts#L2284)

Event pushed through the Google AI Studio voice session's internal queue
while audio chunks stream back from the Gemini Live API.
