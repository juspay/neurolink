[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / VoiceMemoryBindingVerdict

# Type Alias: VoiceMemoryBindingVerdict

> **VoiceMemoryBindingVerdict** = \{ `ok`: `true`; `userId`: `string`; `sessionId`: `string`; `exp`: `number`; \} \| \{ `ok`: `false`; `reason`: [`VoiceMemoryBindingRejection`](VoiceMemoryBindingRejection.md); \}

Result of `verifyVoiceMemoryBinding`.
