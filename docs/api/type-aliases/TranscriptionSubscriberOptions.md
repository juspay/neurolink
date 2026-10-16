[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TranscriptionSubscriberOptions

# Type Alias: TranscriptionSubscriberOptions

> **TranscriptionSubscriberOptions** = `object`

## Properties

### languages?

> `optional` **languages?**: readonly `string`[]

Output languages this listener reads. Empty: the transcript only.

---

### speakers?

> `optional` **speakers?**: readonly `string`[]

Speakers to follow; omitted, every speaker.

---

### backlog?

> `optional` **backlog?**: `boolean`

Replay the backlog on subscribe. Default true.

---

### interim?

> `optional` **interim?**: `boolean`

Also deliver `interim` captions. Default true.
