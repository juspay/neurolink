[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / StreamSerializerAdapter

# Type Alias: StreamSerializerAdapter

> **StreamSerializerAdapter** = `object`

Defined in: [types/proxy.ts:3088](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3088)

Common adapter interface that hides the differences between
Claude and OpenAI stream serializers from the unified translation engine.

## Methods

### start()

> **start**(): `Iterable`\<`string`\>

Defined in: [types/proxy.ts:3089](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3089)

#### Returns

`Iterable`\<`string`\>

---

### pushDelta()

> **pushDelta**(`text`): `Iterable`\<`string`\>

Defined in: [types/proxy.ts:3090](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3090)

#### Parameters

##### text

`string`

#### Returns

`Iterable`\<`string`\>

---

### pushToolUse()

> **pushToolUse**(`id`, `name`, `input`): `Iterable`\<`string`\>

Defined in: [types/proxy.ts:3091](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3091)

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

Defined in: [types/proxy.ts:3092](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3092)

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

Defined in: [types/proxy.ts:3096](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3096)

#### Parameters

##### message

`string`

#### Returns

`Iterable`\<`string`\>
