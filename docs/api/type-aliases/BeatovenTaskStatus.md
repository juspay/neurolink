[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / BeatovenTaskStatus

# Type Alias: BeatovenTaskStatus

> **BeatovenTaskStatus** = `object`

Beatoven.ai task status response.

Used by `BeatovenMusic` handler to type-check polling responses.

## Properties

### status

> **status**: `"composing"` \| `"running"` \| `"composed"` \| `"failed"`

---

### meta?

> `optional` **meta?**: `object`

#### track_url?

> `optional` **track_url?**: `string`

#### project_id?

> `optional` **project_id?**: `string`

#### track_id?

> `optional` **track_id?**: `string`

#### duration?

> `optional` **duration?**: `number`

---

### message?

> `optional` **message?**: `string`
