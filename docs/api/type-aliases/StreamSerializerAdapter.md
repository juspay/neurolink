[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / StreamSerializerAdapter

# Type Alias: StreamSerializerAdapter

> **StreamSerializerAdapter** = `object`

Defined in: [types/proxy.ts:3558](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3558)

Common adapter interface that hides the differences between
Claude and OpenAI stream serializers from the unified translation engine.

## Methods

### start()

> **start**(): `Iterable`\<`string`\>

Defined in: [types/proxy.ts:3559](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3559)

#### Returns

`Iterable`\<`string`\>

---

### pushDelta()

> **pushDelta**(`text`): `Iterable`\<`string`\>

Defined in: [types/proxy.ts:3560](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3560)

#### Parameters

##### text

`string`

#### Returns

`Iterable`\<`string`\>

---

### pushToolUse()

> **pushToolUse**(`id`, `name`, `input`): `Iterable`\<`string`\>

Defined in: [types/proxy.ts:3561](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3561)

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

Defined in: [types/proxy.ts:3562](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3562)

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

Defined in: [types/proxy.ts:3566](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3566)

#### Parameters

##### message

`string`

#### Returns

`Iterable`\<`string`\>
