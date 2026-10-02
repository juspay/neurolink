[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TTSSynthesisMode

# Type Alias: TTSSynthesisMode

> **TTSSynthesisMode** = `"direct"` \| `"response"`

What `generate({ tts })` synthesizes.

- `"direct"` — the input text / prompt itself, with no LLM call. This is
  the default, and what every documented "speak this text" caller relies
  on.
- `"response"` — the model's generated reply, after generation completes.

`stream()` always synthesizes the streamed response and ignores this.
