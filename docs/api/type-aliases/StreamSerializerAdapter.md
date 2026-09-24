[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / StreamSerializerAdapter

# Type Alias: StreamSerializerAdapter

> **StreamSerializerAdapter** = `object`

Defined in: [types/proxy.ts:3808](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3808)

Common adapter interface that hides the differences between
Claude and OpenAI stream serializers from the unified translation engine.

## Methods

### start()

> **start**(): `Iterable`\<`string`\>

Defined in: [types/proxy.ts:3809](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3809)

#### Returns

`Iterable`\<`string`\>

---

### pushDelta()

> **pushDelta**(`text`): `Iterable`\<`string`\>

Defined in: [types/proxy.ts:3810](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3810)

#### Parameters

##### text

`string`

#### Returns

`Iterable`\<`string`\>

---

### pushToolUse()

> **pushToolUse**(`id`, `name`, `input`): `Iterable`\<`string`\>

Defined in: [types/proxy.ts:3811](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3811)

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

Defined in: [types/proxy.ts:3812](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3812)

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

Defined in: [types/proxy.ts:3816](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3816)

#### Parameters

##### message

`string`

#### Returns

`Iterable`\<`string`\>
