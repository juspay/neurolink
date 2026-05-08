[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / RawStreamCaptureResult

# Type Alias: RawStreamCaptureResult

> **RawStreamCaptureResult** = `object`

Defined in: [types/proxy.ts:1040](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/proxy.ts#L1040)

Transformed stream pair used to capture upstream bodies without buffering.

## Properties

### stream

> **stream**: `TransformStream`\<`Uint8Array`, `Uint8Array`\>

Defined in: [types/proxy.ts:1041](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/proxy.ts#L1041)

---

### capture

> **capture**: `Promise`\<[`RawStreamCapture`](RawStreamCapture.md)\>

Defined in: [types/proxy.ts:1042](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/proxy.ts#L1042)
