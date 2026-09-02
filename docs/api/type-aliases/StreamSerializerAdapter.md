[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / StreamSerializerAdapter

# Type Alias: StreamSerializerAdapter

> **StreamSerializerAdapter** = `object`

Defined in: [types/proxy.ts:3180](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3180)

Common adapter interface that hides the differences between
Claude and OpenAI stream serializers from the unified translation engine.

## Methods

### start()

> **start**(): `Iterable`\<`string`\>

Defined in: [types/proxy.ts:3181](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3181)

#### Returns

`Iterable`\<`string`\>

---

### pushDelta()

> **pushDelta**(`text`): `Iterable`\<`string`\>

Defined in: [types/proxy.ts:3182](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3182)

#### Parameters

##### text

`string`

#### Returns

`Iterable`\<`string`\>

---

### pushToolUse()

> **pushToolUse**(`id`, `name`, `input`): `Iterable`\<`string`\>

Defined in: [types/proxy.ts:3183](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3183)

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

Defined in: [types/proxy.ts:3184](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3184)

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

Defined in: [types/proxy.ts:3188](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3188)

#### Parameters

##### message

`string`

#### Returns

`Iterable`\<`string`\>
