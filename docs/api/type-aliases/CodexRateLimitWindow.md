[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CodexRateLimitWindow

# Type Alias: CodexRateLimitWindow

> **CodexRateLimitWindow** = `object`

One rate-limit window as reported by the Codex backend (primary/secondary).

## Properties

### used_percent?

> `optional` **used_percent?**: `number` \| `null`

---

### window_minutes?

> `optional` **window_minutes?**: `number` \| `null`

---

### resets_in_seconds?

> `optional` **resets_in_seconds?**: `number` \| `null`

---

### reset_after?

> `optional` **reset_after?**: `number` \| `null`

Seconds until reset. Observed alias of `resets_in_seconds` on some
responses; accepted defensively so a cooldown lands on the real reset
instead of degrading to the transient ceiling.

---

### resets_at?

> `optional` **resets_at?**: `number` \| `null`

---

### reset_after_seconds?

> `optional` **reset_after_seconds?**: `number` \| `null`

Current WHAM usage fields.

---

### reset_at?

> `optional` **reset_at?**: `number` \| `null`
