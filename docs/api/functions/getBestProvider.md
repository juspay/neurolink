[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / getBestProvider

# Function: getBestProvider()

> **getBestProvider**(`requestedProvider?`): `Promise`\<`string`\>

Defined in: [utils/providerUtils.ts:30](https://github.com/juspay/neurolink/blob/release/src/lib/utils/providerUtils.ts#L30)

Get the best available provider based on real-time availability checks
Enhanced version consolidated from providerUtils-fixed.ts

## Parameters

### requestedProvider?

`string`

Optional preferred provider name

## Returns

`Promise`\<`string`\>

The best provider name to use
