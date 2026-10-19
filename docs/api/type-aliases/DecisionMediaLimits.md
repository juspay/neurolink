[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DecisionMediaLimits

# Type Alias: DecisionMediaLimits

> **DecisionMediaLimits** = `object`

## Properties

### maxImages

> **maxImages**: `number`

Most images one request may carry.

---

### video

> **video**: `boolean`

Whether a video is accepted (at most one).

---

### maxRequestBytes

> **maxRequestBytes**: `number`

Ceiling on the encoded request body, in bytes.

---

### audio?

> `optional` **audio?**: [`DecisionAudioLimits`](DecisionAudioLimits.md)

Whether one audio clip is accepted, and how much of it the model hears. Absent means no audio.
