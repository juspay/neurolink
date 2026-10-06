[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / STTEndpointerEvent

# Type Alias: STTEndpointerEvent

> **STTEndpointerEvent** = \{ `type`: `"start"`; `utterance`: [`STTEndpointerUtterance`](STTEndpointerUtterance.md); \} \| \{ `type`: `"end"`; `utterance`: [`STTEndpointerUtterance`](STTEndpointerUtterance.md); `reason`: `"silence"` \| `"softCut"` \| `"hardCut"` \| `"flush"`; \} \| \{ `type`: `"drop"`; `utterance`: [`STTEndpointerUtterance`](STTEndpointerUtterance.md); \}

## Union Members

### Type Literal

\{ `type`: `"start"`; `utterance`: [`STTEndpointerUtterance`](STTEndpointerUtterance.md); \}

---

### Type Literal

\{ `type`: `"end"`; `utterance`: [`STTEndpointerUtterance`](STTEndpointerUtterance.md); `reason`: `"silence"` \| `"softCut"` \| `"hardCut"` \| `"flush"`; \}

---

### Type Literal

\{ `type`: `"drop"`; `utterance`: [`STTEndpointerUtterance`](STTEndpointerUtterance.md); \}

Too little speech and nothing heard: a cough or a click.
