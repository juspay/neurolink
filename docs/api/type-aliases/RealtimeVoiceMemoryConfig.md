[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RealtimeVoiceMemoryConfig

# Type Alias: RealtimeVoiceMemoryConfig

> **RealtimeVoiceMemoryConfig** = `object`

Memory options for `defineRealtimeVoiceAgent`.

## Properties

### createNeuroLink

> **createNeuroLink**: () => [`LiveKitMemoryNeuroLink`](LiveKitMemoryNeuroLink.md) \| `Promise`\<[`LiveKitMemoryNeuroLink`](LiveKitMemoryNeuroLink.md)\>

Builds the NeuroLink instance, with conversation memory configured the
same way the web app's is (same store, key prefix and lifetime), inside
the job process. Called once per call, only after a binding verified.

#### Returns

[`LiveKitMemoryNeuroLink`](LiveKitMemoryNeuroLink.md) \| `Promise`\<[`LiveKitMemoryNeuroLink`](LiveKitMemoryNeuroLink.md)\>

---

### secret?

> `optional` **secret?**: `string`

Shared secret the binding is signed with. Defaults to `NEUROLINK_VOICE_MEMORY_SECRET`.

---

### settleMs?

> `optional` **settleMs?**: `number`

How long a closed reply waits for its user transcript before being dropped (default 1500 ms).

---

### flushBudgetMs?

> `optional` **flushBudgetMs?**: `number`

How long shutdown waits for pending writes (default 800 ms; the worker is reaped about 1 s after shutdown starts).

---

### seed?

> `optional` **seed?**: `false` \| \{ `maxTurns?`: `number`; `maxChars?`: `number`; \}

History seeding at call start. `false` turns it off. Defaults: 10 exchanges, 6000 characters.
