[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / StreamSerializerAdapter

# Type Alias: StreamSerializerAdapter

> **StreamSerializerAdapter** = `object`

Defined in: [types/proxy.ts:3533](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3533)

Common adapter interface that hides the differences between
Claude and OpenAI stream serializers from the unified translation engine.

## Methods

### start()

> **start**(): `Iterable`\<`string`\>

Defined in: [types/proxy.ts:3534](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3534)

#### Returns

`Iterable`\<`string`\>

---

### pushDelta()

> **pushDelta**(`text`): `Iterable`\<`string`\>

Defined in: [types/proxy.ts:3535](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3535)

#### Parameters

##### text

`string`

#### Returns

`Iterable`\<`string`\>

---

### pushToolUse()

> **pushToolUse**(`id`, `name`, `input`): `Iterable`\<`string`\>

Defined in: [types/proxy.ts:3536](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3536)

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

Defined in: [types/proxy.ts:3537](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3537)

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

Defined in: [types/proxy.ts:3541](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3541)

#### Parameters

##### message

`string`

#### Returns

`Iterable`\<`string`\>
