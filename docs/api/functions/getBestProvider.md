[**NeuroLink API Reference v8.26.1**](../README.md)

---

[NeuroLink API Reference](../globals.md) / getBestProvider

# Function: getBestProvider()

> **getBestProvider**(`requestedProvider?`): `Promise`\<`string`\>

Defined in: [utils/providerUtils.ts:24](https://github.com/juspay/neurolink/blob/997832c0dc437abf3a045a6ab43aafda5c330f4e/src/lib/utils/providerUtils.ts#L24)

Get the best available provider based on real-time availability checks
Enhanced version consolidated from providerUtils-fixed.ts

## Parameters

### requestedProvider?

`string`

Optional preferred provider name

## Returns

`Promise`\<`string`\>

The best provider name to use
