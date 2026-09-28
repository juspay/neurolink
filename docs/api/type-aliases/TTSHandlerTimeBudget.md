[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TTSHandlerTimeBudget

# Type Alias: TTSHandlerTimeBudget

> **TTSHandlerTimeBudget** = `object`

Handler-level wall-clock knobs a provider option type may carry (today:
`ElevenLabsTTSOptions`). `generate()`'s outer synthesis timeout is raised to
at least `timeoutMs × (1 + retries)` plus backoff slack — with the handler
defaults (30 s, one retry) standing in for a knob the caller left unset —
so a handler's own retry loop is never cut short from outside.

## Properties

### timeoutMs?

> `optional` **timeoutMs?**: `number`

Per-attempt request timeout in milliseconds (default 30 000; capped at 2³¹−1).

---

### retries?

> `optional` **retries?**: `number`

Retries after the first attempt (total attempts = 1 + retries).
