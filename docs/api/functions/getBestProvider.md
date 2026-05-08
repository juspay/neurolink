[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / getBestProvider

# Function: getBestProvider()

> **getBestProvider**(`requestedProvider?`): `Promise`\<`string`\>

Defined in: [utils/providerUtils.ts:26](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/utils/providerUtils.ts#L26)

Get the best available provider based on real-time availability checks
Enhanced version consolidated from providerUtils-fixed.ts

## Parameters

### requestedProvider?

`string`

Optional preferred provider name

## Returns

`Promise`\<`string`\>

The best provider name to use
