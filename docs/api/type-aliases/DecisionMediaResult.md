[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DecisionMediaResult

# Type Alias: DecisionMediaResult

> **DecisionMediaResult** = \{ `status`: `"prepared"`; `media`: [`DecisionPreparedMedia`](DecisionPreparedMedia.md) \| `undefined`; \} \| \{ `status`: `"refused"`; `message`: `string`; \}

Discriminated by a string literal, not a boolean: the package is also
compiled without strictNullChecks, where a boolean discriminant does not
narrow.
