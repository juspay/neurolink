[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProviderRequestDefaults

# Type Alias: ProviderRequestDefaults

> **ProviderRequestDefaults** = `object`

Request values a provider fills in when the caller leaves them out.

## Properties

### temperature?

> `optional` **temperature?**: `number`

Sampling temperature sent when the caller gives none.

---

### largeOutputThresholdTokens?

> `optional` **largeOutputThresholdTokens?**: `number`

Above this many output tokens, a generate call gets a longer timeout.

---

### largeOutputTimeoutFloorMs?

> `optional` **largeOutputTimeoutFloorMs?**: `number`

The shortest timeout, in ms, for a generate call above that threshold.

---

### clientTimeoutMs?

> `optional` **clientTimeoutMs?**: `number`

Explicit SDK client timeout, in ms.

---

### finalizationMinTokens?

> `optional` **finalizationMinTokens?**: `number`

Output-token floor of a forced finalization call.

---

### finalizationHeadroomTokens?

> `optional` **finalizationHeadroomTokens?**: `number`

Context-window headroom kept when sizing that call.
