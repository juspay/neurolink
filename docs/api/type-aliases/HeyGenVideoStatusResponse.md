[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / HeyGenVideoStatusResponse

# Type Alias: HeyGenVideoStatusResponse

> **HeyGenVideoStatusResponse** = `object`

HeyGen `/v1/video_status.get` response shape.

## Properties

### code?

> `optional` **code?**: `number`

---

### data?

> `optional` **data?**: `object`

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
