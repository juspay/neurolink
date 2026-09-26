[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TypedEventEmitter

# Class: TypedEventEmitter\<TEvents\>

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

#### Type Parameters

##### K

`K` _extends_ `string` \| `number` \| `symbol`

#### Parameters

##### event?

`K`

#### Returns

`this`
