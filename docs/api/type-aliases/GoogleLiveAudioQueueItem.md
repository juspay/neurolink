[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / GoogleLiveAudioQueueItem

# Type Alias: GoogleLiveAudioQueueItem

> **GoogleLiveAudioQueueItem** = \{ `type`: `"audio"`; `audio`: [`AudioChunk`](AudioChunk.md); \} \| \{ `type`: `"end"`; \} \| \{ `type`: `"error"`; `error`: `unknown`; \}

Defined in: [types/providers.ts:1945](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/providers.ts#L1945)

Event pushed through the Google AI Studio voice session's internal queue
while audio chunks stream back from the Gemini Live API.
