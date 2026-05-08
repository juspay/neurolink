[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / Logger

# Type Alias: Logger

> **Logger** = `object`

Defined in: [types/utilities.ts:81](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/utilities.ts#L81)

Logger interface matching the logger object shape
Used for SDK tool contexts and other components that need a logger

## Properties

### debug

> **debug**: (...`args`) => `void`

Defined in: [types/utilities.ts:82](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/utilities.ts#L82)

#### Parameters

##### args

...`unknown`[]

#### Returns

`void`

---

### info

> **info**: (...`args`) => `void`

Defined in: [types/utilities.ts:83](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/utilities.ts#L83)

#### Parameters

##### args

...`unknown`[]

#### Returns

`void`

---

### warn

> **warn**: (...`args`) => `void`

Defined in: [types/utilities.ts:84](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/utilities.ts#L84)

#### Parameters

##### args

...`unknown`[]

#### Returns

`void`

---

### error

> **error**: (...`args`) => `void`

Defined in: [types/utilities.ts:85](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/utilities.ts#L85)

#### Parameters

##### args

...`unknown`[]

#### Returns

`void`

---

### always

> **always**: (...`args`) => `void`

Defined in: [types/utilities.ts:86](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/utilities.ts#L86)

#### Parameters

##### args

...`unknown`[]

#### Returns

`void`

---

### table

> **table**: (`data`) => `void`

Defined in: [types/utilities.ts:87](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/utilities.ts#L87)

#### Parameters

##### data

`unknown`

#### Returns

`void`

---

### setLogLevel

> **setLogLevel**: (`level`) => `void`

Defined in: [types/utilities.ts:88](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/utilities.ts#L88)

#### Parameters

##### level

[`LogLevel`](LogLevel.md)

#### Returns

`void`

---

### getLogs

> **getLogs**: (`level?`) => [`LogEntry`](LogEntry.md)[]

Defined in: [types/utilities.ts:89](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/utilities.ts#L89)

#### Parameters

##### level?

[`LogLevel`](LogLevel.md)

#### Returns

[`LogEntry`](LogEntry.md)[]

---

### clearLogs

> **clearLogs**: () => `void`

Defined in: [types/utilities.ts:90](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/utilities.ts#L90)

#### Returns

`void`

---

### setEventEmitter

> **setEventEmitter**: (`emitter`) => `void`

Defined in: [types/utilities.ts:91](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/utilities.ts#L91)

#### Parameters

##### emitter

###### emit

(`event`, ...`args`) => `boolean`

#### Returns

`void`

---

### clearEventEmitter

> **clearEventEmitter**: () => `void`

Defined in: [types/utilities.ts:94](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/utilities.ts#L94)

#### Returns

`void`
