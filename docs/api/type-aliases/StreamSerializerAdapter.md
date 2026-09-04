[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / StreamSerializerAdapter

# Type Alias: StreamSerializerAdapter

> **StreamSerializerAdapter** = `object`

Defined in: [types/proxy.ts:3195](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3195)

Common adapter interface that hides the differences between
Claude and OpenAI stream serializers from the unified translation engine.

## Methods

### start()

> **start**(): `Iterable`\<`string`\>

Defined in: [types/proxy.ts:3196](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3196)

#### Returns

`Iterable`\<`string`\>

---

### pushDelta()

> **pushDelta**(`text`): `Iterable`\<`string`\>

Defined in: [types/proxy.ts:3197](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3197)

#### Parameters

##### text

`string`

#### Returns

`Iterable`\<`string`\>

---

### pushToolUse()

> **pushToolUse**(`id`, `name`, `input`): `Iterable`\<`string`\>

Defined in: [types/proxy.ts:3198](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3198)

#### Parameters

##### id

`string`

##### name

`string`

##### input

`unknown`

#### Returns

`Iterable`\<`string`\>

---

### finish()

> **finish**(`finishReason`, `usage`): `Iterable`\<`string`\>

Defined in: [types/proxy.ts:3199](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3199)

#### Parameters

##### finishReason

`string`

##### usage

###### input

`number`

###### output

`number`

###### total

`number`

#### Returns

`Iterable`\<`string`\>

---

### emitError()

> **emitError**(`message`): `Iterable`\<`string`\>

Defined in: [types/proxy.ts:3203](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3203)

#### Parameters

##### message

`string`

#### Returns

`Iterable`\<`string`\>
