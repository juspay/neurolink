[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / GenerateStopReason

# Type Alias: GenerateStopReason

> **GenerateStopReason** = `"completed"` \| `"step-cap"` \| `"context-cap"` \| `"time-limit"` \| `"stalled"` \| `"aborted"` \| `"provider-error"`

Defined in: [types/generate.ts:899](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L899)

Why an agentic turn ended — the discriminator consumers should branch on
instead of sniffing the provider-shaped `finishReason` (whose values are
overloaded: e.g. "tool-calls" historically covered both step-cap exits and
Gemini MALFORMED_FUNCTION_CALL provider errors).

- `completed` — the model finished on its own (text answer or final_result)
- `step-cap` — the `maxSteps` budget ran out while the model still wanted tools
- `context-cap` — the in-loop context guard stopped the tool loop because the
  accumulated conversation approached the model's context window (and the
  terminal synthesis could not produce an answer); without the guard these
  turns died mid-loop on a provider 400 "prompt is too long"
- `time-limit` — the `turnTimeoutMs` wall-clock deadline passed
- `stalled` — no progress (no chunk, no tool start/finish) for `stallTimeoutMs`
- `aborted` — the caller's `abortSignal` ended the turn
- `provider-error` — the provider/model failed the turn (e.g. persistent
  MALFORMED_FUNCTION_CALL after retry); usually worth a caller-side retry
