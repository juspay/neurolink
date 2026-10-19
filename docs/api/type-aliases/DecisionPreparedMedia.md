[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DecisionPreparedMedia

# Type Alias: DecisionPreparedMedia

> **DecisionPreparedMedia** = `object`

Media after preparation: images and video are `data:` URLs, ready for the wire.

## Properties

### images

> **images**: `string`[]

---

### video?

> `optional` **video?**: `string`

---

### audio?

> `optional` **audio?**: [`DecisionPreparedAudio`](DecisionPreparedAudio.md)

---

### bytes

> **bytes**: `number`

Encoded size of everything above.
