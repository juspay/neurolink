[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DecisionMediaSourceRead

# Type Alias: DecisionMediaSourceRead

> **DecisionMediaSourceRead** = \{ `status`: `"buffer"`; `buffer`: `Buffer`; \} \| \{ `status`: `"dataUrl"`; `dataUrl`: `string`; \} \| \{ `status`: `"error"`; `message`: `string`; \}

A caller's media source resolved for one kind: bytes to identify (a Buffer
or a file read from disk), a `data:` URL of that kind as given, or the reason
it is refused.
