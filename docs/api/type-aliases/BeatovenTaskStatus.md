[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / BeatovenTaskStatus

# Type Alias: BeatovenTaskStatus

> **BeatovenTaskStatus** = `object`

Defined in: [types/music.ts:169](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/music.ts#L169)

Beatoven.ai task status response.

Used by `BeatovenMusic` handler to type-check polling responses.

## Properties

### status

> **status**: `"composing"` \| `"running"` \| `"composed"` \| `"failed"`

Defined in: [types/music.ts:170](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/music.ts#L170)

---

### meta?

> `optional` **meta?**: `object`

Defined in: [types/music.ts:171](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/music.ts#L171)

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

Defined in: [types/music.ts:177](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/music.ts#L177)
