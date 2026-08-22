[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / HeyGenVideoStatusResponse

# Type Alias: HeyGenVideoStatusResponse

> **HeyGenVideoStatusResponse** = `object`

Defined in: [types/avatar.ts:167](https://github.com/juspay/neurolink/blob/release/src/lib/types/avatar.ts#L167)

HeyGen `/v1/video_status.get` response shape.

## Properties

### code?

> `optional` **code?**: `number`

Defined in: [types/avatar.ts:168](https://github.com/juspay/neurolink/blob/release/src/lib/types/avatar.ts#L168)

---

### data?

> `optional` **data?**: `object`

Defined in: [types/avatar.ts:169](https://github.com/juspay/neurolink/blob/release/src/lib/types/avatar.ts#L169)

#### id?

> `optional` **id?**: `string`

#### status?

> `optional` **status?**: `"pending"` \| `"processing"` \| `"completed"` \| `"failed"`

#### video_url?

> `optional` **video_url?**: `string`

#### thumbnail_url?

> `optional` **thumbnail_url?**: `string`

#### duration?

> `optional` **duration?**: `number`

#### error?

> `optional` **error?**: `object`

##### error.code?

> `optional` **code?**: `string`

##### error.message?

> `optional` **message?**: `string`

##### error.detail?

> `optional` **detail?**: `string`

---

### message?

> `optional` **message?**: `string`

Defined in: [types/avatar.ts:181](https://github.com/juspay/neurolink/blob/release/src/lib/types/avatar.ts#L181)
