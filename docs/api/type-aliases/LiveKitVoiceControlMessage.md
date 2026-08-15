[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / LiveKitVoiceControlMessage

# Type Alias: LiveKitVoiceControlMessage

> **LiveKitVoiceControlMessage** = \{ `action`: `"hitl:accept"`; `confirmationId`: `string`; `modifiedArguments?`: `unknown`; \} \| \{ `action`: `"hitl:reject"`; `confirmationId`: `string`; `reason?`: `string`; \}

Defined in: [types/livekit.ts:330](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/livekit.ts#L330)

Control messages sent from the browser back to the agent.
