[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / CobraInstance

# Type Alias: CobraInstance

> **CobraInstance** = `object`

Defined in: [types/server.ts:1476](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L1476)

Structural type for Picovoice Cobra VAD instance.
Defined here so the optional `@picovoice/cobra-node` package
is not required at typecheck time.

## Properties

### frameLength

> **frameLength**: `number`

Defined in: [types/server.ts:1477](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L1477)

---

### process

> **process**: (`pcm`) => `number`

Defined in: [types/server.ts:1478](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L1478)

#### Parameters

##### pcm

`Int16Array`

#### Returns

`number`

---

### release

> **release**: () => `void`

Defined in: [types/server.ts:1479](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L1479)

#### Returns

`void`
