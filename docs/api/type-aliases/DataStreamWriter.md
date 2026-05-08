[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / DataStreamWriter

# Type Alias: DataStreamWriter

> **DataStreamWriter** = `object`

Defined in: [types/server.ts:864](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L864)

Data stream writer interface

## Methods

### writeTextStart()

> **writeTextStart**(`id`): `Promise`\<`void`\>

Defined in: [types/server.ts:866](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L866)

Write text start event

#### Parameters

##### id

`string`

#### Returns

`Promise`\<`void`\>

---

### writeTextDelta()

> **writeTextDelta**(`id`, `delta`): `Promise`\<`void`\>

Defined in: [types/server.ts:869](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L869)

Write text delta event

#### Parameters

##### id

`string`

##### delta

`string`

#### Returns

`Promise`\<`void`\>

---

### writeTextEnd()

> **writeTextEnd**(`id`): `Promise`\<`void`\>

Defined in: [types/server.ts:872](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L872)

Write text end event

#### Parameters

##### id

`string`

#### Returns

`Promise`\<`void`\>

---

### writeToolCall()

> **writeToolCall**(`toolCall`): `Promise`\<`void`\>

Defined in: [types/server.ts:875](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L875)

Write tool call event

#### Parameters

##### toolCall

###### id

`string`

###### name

`string`

###### arguments

`Record`\<`string`, `unknown`\>

#### Returns

`Promise`\<`void`\>

---

### writeToolResult()

> **writeToolResult**(`toolResult`): `Promise`\<`void`\>

Defined in: [types/server.ts:882](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L882)

Write tool result event

#### Parameters

##### toolResult

###### id

`string`

###### name

`string`

###### result

`unknown`

#### Returns

`Promise`\<`void`\>

---

### writeData()

> **writeData**(`data`): `Promise`\<`void`\>

Defined in: [types/server.ts:889](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L889)

Write arbitrary data event

#### Parameters

##### data

`unknown`

#### Returns

`Promise`\<`void`\>

---

### writeError()

> **writeError**(`error`): `Promise`\<`void`\>

Defined in: [types/server.ts:892](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L892)

Write error event

#### Parameters

##### error

###### message

`string`

###### code?

`string`

#### Returns

`Promise`\<`void`\>

---

### close()

> **close**(): `Promise`\<`void`\>

Defined in: [types/server.ts:895](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L895)

Close the stream

#### Returns

`Promise`\<`void`\>
