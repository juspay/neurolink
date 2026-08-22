[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / PiiDetectionConfig

# Type Alias: PiiDetectionConfig

> **PiiDetectionConfig** = `object`

Defined in: [types/ioProcessor.ts:26](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/ioProcessor.ts#L26)

## Properties

### enabled?

> `optional` **enabled?**: `boolean`

Defined in: [types/ioProcessor.ts:27](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/ioProcessor.ts#L27)

---

### action

> **action**: `"redact"` \| `"abort"` \| `"warn"`

Defined in: [types/ioProcessor.ts:28](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/ioProcessor.ts#L28)

---

### detectTypes?

> `optional` **detectTypes?**: [`PiiType`](PiiType.md)[]

Defined in: [types/ioProcessor.ts:29](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/ioProcessor.ts#L29)

---

### customPatterns?

> `optional` **customPatterns?**: `RegExp`[]

Defined in: [types/ioProcessor.ts:30](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/ioProcessor.ts#L30)

---

### allowList?

> `optional` **allowList?**: `string`[]

Defined in: [types/ioProcessor.ts:31](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/ioProcessor.ts#L31)

---

### redactionText?

> `optional` **redactionText?**: `string`

Defined in: [types/ioProcessor.ts:32](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/ioProcessor.ts#L32)
