[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / LiveKitVoiceControlMessage

# Type Alias: LiveKitVoiceControlMessage

> **LiveKitVoiceControlMessage** = \{ `action`: `"hitl:accept"`; `confirmationId`: `string`; `modifiedArguments?`: `unknown`; \} \| \{ `action`: `"hitl:reject"`; `confirmationId`: `string`; `reason?`: `string`; \}

Defined in: [types/livekit.ts:330](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/livekit.ts#L330)

Control messages sent from the browser back to the agent.
