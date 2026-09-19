[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / StreamSerializerAdapter

# Type Alias: StreamSerializerAdapter

> **StreamSerializerAdapter** = `object`

Defined in: [types/proxy.ts:3688](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3688)

Common adapter interface that hides the differences between
Claude and OpenAI stream serializers from the unified translation engine.

## Methods

### start()

> **start**(): `Iterable`\<`string`\>

Defined in: [types/proxy.ts:3689](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3689)

#### Returns

`Iterable`\<`string`\>

---

### pushDelta()

> **pushDelta**(`text`): `Iterable`\<`string`\>

Defined in: [types/proxy.ts:3690](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3690)

#### Parameters

##### text

`string`

#### Returns

`Iterable`\<`string`\>

---

### pushToolUse()

> **pushToolUse**(`id`, `name`, `input`): `Iterable`\<`string`\>

Defined in: [types/proxy.ts:3691](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3691)

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

Defined in: [types/proxy.ts:3692](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3692)

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

Defined in: [types/proxy.ts:3696](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3696)

#### Parameters

##### message

`string`

#### Returns

`Iterable`\<`string`\>
