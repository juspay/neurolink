[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / StreamSerializerAdapter

# Type Alias: StreamSerializerAdapter

> **StreamSerializerAdapter** = `object`

Defined in: [types/proxy.ts:3209](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3209)

Common adapter interface that hides the differences between
Claude and OpenAI stream serializers from the unified translation engine.

## Methods

### start()

> **start**(): `Iterable`\<`string`\>

Defined in: [types/proxy.ts:3210](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3210)

#### Returns

`Iterable`\<`string`\>

---

### pushDelta()

> **pushDelta**(`text`): `Iterable`\<`string`\>

Defined in: [types/proxy.ts:3211](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3211)

#### Parameters

##### text

`string`

#### Returns

`Iterable`\<`string`\>

---

### pushToolUse()

> **pushToolUse**(`id`, `name`, `input`): `Iterable`\<`string`\>

Defined in: [types/proxy.ts:3212](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3212)

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

Defined in: [types/proxy.ts:3213](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3213)

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

Defined in: [types/proxy.ts:3217](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3217)

#### Parameters

##### message

`string`

#### Returns

`Iterable`\<`string`\>
