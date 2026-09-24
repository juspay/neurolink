[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / StreamSerializerAdapter

# Type Alias: StreamSerializerAdapter

> **StreamSerializerAdapter** = `object`

Defined in: [types/proxy.ts:3930](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3930)

Common adapter interface that hides the differences between
Claude and OpenAI stream serializers from the unified translation engine.

## Methods

### start()

> **start**(): `Iterable`\<`string`\>

Defined in: [types/proxy.ts:3931](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3931)

#### Returns

`Iterable`\<`string`\>

---

### pushDelta()

> **pushDelta**(`text`): `Iterable`\<`string`\>

Defined in: [types/proxy.ts:3932](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3932)

#### Parameters

##### text

`string`

#### Returns

`Iterable`\<`string`\>

---

### pushToolUse()

> **pushToolUse**(`id`, `name`, `input`): `Iterable`\<`string`\>

Defined in: [types/proxy.ts:3933](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3933)

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

Defined in: [types/proxy.ts:3934](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3934)

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

Defined in: [types/proxy.ts:3938](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3938)

#### Parameters

##### message

`string`

#### Returns

`Iterable`\<`string`\>
