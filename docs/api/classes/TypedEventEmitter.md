[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TypedEventEmitter

# Class: TypedEventEmitter\<TEvents\>

Defined in: [core/infrastructure/typedEventEmitter.ts:3](https://github.com/juspay/neurolink/blob/release/src/lib/core/infrastructure/typedEventEmitter.ts#L3)

## Extended by

- [`RAGCircuitBreaker`](RAGCircuitBreaker.md)

## Type Parameters

### TEvents

`TEvents` _extends_ `Record`\<`string`, `unknown`[]\>

## Constructors

### Constructor

> **new TypedEventEmitter**\<`TEvents`\>(): `TypedEventEmitter`\<`TEvents`\>

#### Returns

`TypedEventEmitter`\<`TEvents`\>

## Methods

### on()

> **on**\<`K`\>(`event`, `listener`): `this`

Defined in: [core/infrastructure/typedEventEmitter.ts:6](https://github.com/juspay/neurolink/blob/release/src/lib/core/infrastructure/typedEventEmitter.ts#L6)

#### Type Parameters

##### K

`K` _extends_ `string` \| `number` \| `symbol`

#### Parameters

##### event

`K`

##### listener

(...`args`) => `void`

#### Returns

`this`

---

### off()

> **off**\<`K`\>(`event`, `listener`): `this`

Defined in: [core/infrastructure/typedEventEmitter.ts:14](https://github.com/juspay/neurolink/blob/release/src/lib/core/infrastructure/typedEventEmitter.ts#L14)

#### Type Parameters

##### K

`K` _extends_ `string` \| `number` \| `symbol`

#### Parameters

##### event

`K`

##### listener

(...`args`) => `void`

#### Returns

`this`

---

### emit()

> **emit**\<`K`\>(`event`, ...`args`): `boolean`

Defined in: [core/infrastructure/typedEventEmitter.ts:22](https://github.com/juspay/neurolink/blob/release/src/lib/core/infrastructure/typedEventEmitter.ts#L22)

#### Type Parameters

##### K

`K` _extends_ `string` \| `number` \| `symbol`

#### Parameters

##### event

`K`

##### args

...`TEvents`\[`K`\]

#### Returns

`boolean`

---

### once()

> **once**\<`K`\>(`event`, `listener`): `this`

Defined in: [core/infrastructure/typedEventEmitter.ts:26](https://github.com/juspay/neurolink/blob/release/src/lib/core/infrastructure/typedEventEmitter.ts#L26)

#### Type Parameters

##### K

`K` _extends_ `string` \| `number` \| `symbol`

#### Parameters

##### event

`K`

##### listener

(...`args`) => `void`

#### Returns

`this`

---

### removeAllListeners()

> **removeAllListeners**\<`K`\>(`event?`): `this`

Defined in: [core/infrastructure/typedEventEmitter.ts:37](https://github.com/juspay/neurolink/blob/release/src/lib/core/infrastructure/typedEventEmitter.ts#L37)

#### Type Parameters

##### K

`K` _extends_ `string` \| `number` \| `symbol`

#### Parameters

##### event?

`K`

#### Returns

`this`
