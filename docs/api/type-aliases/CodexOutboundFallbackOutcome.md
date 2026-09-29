[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CodexOutboundFallbackOutcome

# Type Alias: CodexOutboundFallbackOutcome

> **CodexOutboundFallbackOutcome** = \{ `kind`: `"not_attempted"`; \} \| \{ `kind`: `"request_too_large"`; `message`: `string`; \} \| \{ `kind`: `"success"`; `response`: `Response`; \}

Outcome of one `attemptCodexOutboundFallback` call. `not_attempted` covers
every gate failure and every target exhausting without success — the
caller falls through to its own existing (unchanged) error response in
every one of those cases, so the flag-off / all-targets-failed paths stay
byte-identical to today.
