[**NeuroLink API Reference v8.32.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / getBestProvider

# Function: getBestProvider()

> **getBestProvider**(`requestedProvider?`): `Promise`\<`string`\>

Defined in: [utils/providerUtils.ts:24](https://github.com/juspay/neurolink/blob/e2ee0ff27847312a233f21617e325b3d2c69c76c/src/lib/utils/providerUtils.ts#L24)

Get the best available provider based on real-time availability checks
Enhanced version consolidated from providerUtils-fixed.ts

## Parameters

### requestedProvider?

`string`

Optional preferred provider name

## Returns

`Promise`\<`string`\>

The best provider name to use
