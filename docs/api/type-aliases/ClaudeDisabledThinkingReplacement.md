[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClaudeDisabledThinkingReplacement

# Type Alias: ClaudeDisabledThinkingReplacement

> **ClaudeDisabledThinkingReplacement** = `"keep"` \| `"between_tools"` \| `"omit"`

What a request should carry in place of `thinking: {type: "disabled"}` for a
Claude model: the original (`keep`), `between_tools`, or no `thinking` field
at all (`omit`, i.e. adaptive).
