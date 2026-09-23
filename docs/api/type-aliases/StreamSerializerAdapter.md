[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / StreamSerializerAdapter

# Type Alias: StreamSerializerAdapter

> **StreamSerializerAdapter** = `object`

Defined in: [types/proxy.ts:3785](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3785)

Common adapter interface that hides the differences between
Claude and OpenAI stream serializers from the unified translation engine.

## Methods

### start()

> **start**(): `Iterable`\<`string`\>

Defined in: [types/proxy.ts:3786](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3786)

#### Returns

`Iterable`\<`string`\>

---

### pushDelta()

> **pushDelta**(`text`): `Iterable`\<`string`\>

Defined in: [types/proxy.ts:3787](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3787)

#### Parameters

##### text

`string`

#### Returns

`Iterable`\<`string`\>

---

### pushToolUse()

> **pushToolUse**(`id`, `name`, `input`): `Iterable`\<`string`\>

Defined in: [types/proxy.ts:3788](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3788)

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

Defined in: [types/proxy.ts:3789](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3789)

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

Defined in: [types/proxy.ts:3793](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3793)

#### Parameters

##### message

`string`

#### Returns

`Iterable`\<`string`\>
