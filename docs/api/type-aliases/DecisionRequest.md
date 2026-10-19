[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DecisionRequest

# Type Alias: DecisionRequest

> **DecisionRequest** = `object`

## Properties

### state

> **state**: [`DecisionState`](DecisionState.md)

---

### questions

> **questions**: [`DecisionQuestionMap`](DecisionQuestionMap.md)

---

### images?

> `optional` **images?**: readonly [`DecisionMediaSource`](DecisionMediaSource.md)[]

Images the model reads alongside `state`. Each is a Buffer, a local file
path or a `data:image/…;base64,` URL; an http(s) URL is refused. Only a
provider whose descriptor declares `decisionLimits.media` accepts them.

---

### video?

> `optional` **video?**: [`DecisionMediaSource`](DecisionMediaSource.md)

One video, in the same forms. Sending images as well is allowed.

---

### audio?

> `optional` **audio?**: [`DecisionMediaSource`](DecisionMediaSource.md)

One audio clip, in the same forms (a `data:audio/…;base64,` URL). Only a
provider whose `decisionLimits.media.audio` is set accepts it.

---

### model?

> `optional` **model?**: `string`

Overrides the provider's configured model for this call only.

---

### signal?

> `optional` **signal?**: `AbortSignal`

---

### timeoutMs?

> `optional` **timeoutMs?**: `number`

Overrides the configured timeout for this call only.
