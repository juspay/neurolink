[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / StreamSerializerAdapter

# Type Alias: StreamSerializerAdapter

> **StreamSerializerAdapter** = `object`

Defined in: [types/proxy.ts:3880](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3880)

Common adapter interface that hides the differences between
Claude and OpenAI stream serializers from the unified translation engine.

## Methods

### start()

> **start**(): `Iterable`\<`string`\>

Defined in: [types/proxy.ts:3881](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3881)

#### Returns

`Iterable`\<`string`\>

---

### pushDelta()

> **pushDelta**(`text`): `Iterable`\<`string`\>

Defined in: [types/proxy.ts:3882](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3882)

#### Parameters

##### text

`string`

#### Returns

`Iterable`\<`string`\>

---

### pushToolUse()

> **pushToolUse**(`id`, `name`, `input`): `Iterable`\<`string`\>

Defined in: [types/proxy.ts:3883](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3883)

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

Defined in: [types/proxy.ts:3884](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3884)

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

Defined in: [types/proxy.ts:3888](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3888)

#### Parameters

##### message

`string`

#### Returns

`Iterable`\<`string`\>
