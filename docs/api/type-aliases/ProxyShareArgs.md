[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareArgs

# Type Alias: ProxyShareArgs

> **ProxyShareArgs** = `object`

Defined in: [types/cli.ts:2178](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2178)

## Properties

### action?

> `optional` **action?**: [`ProxyShareCliAction`](ProxyShareCliAction.md)

Defined in: [types/cli.ts:2179](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2179)

---

### value?

> `optional` **value?**: `string`

Defined in: [types/cli.ts:2181](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2181)

Positional argument for actions that take one, e.g. `share url <url>`.

---

### clear?

> `optional` **clear?**: `boolean`

Defined in: [types/cli.ts:2183](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2183)

`share url --clear`: forget this node's recorded public address.

---

### peer?

> `optional` **peer?**: `string`

Defined in: [types/cli.ts:2184](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2184)

---

### fromAccount?

> `optional` **fromAccount?**: `string`

Defined in: [types/cli.ts:2186](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2186)

Lender account a complete share is minted from, for drift auditing.

---

### code?

> `optional` **code?**: `string`

Defined in: [types/cli.ts:2188](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2188)

Authorization code from the lender's browser, for split provisioning.

---

### ttl?

> `optional` **ttl?**: `string`

Defined in: [types/cli.ts:2190](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2190)

`share note`: how long the note stays redeemable.

---

### memo?

> `optional` **memo?**: `string`

Defined in: [types/cli.ts:2192](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2192)

`share note`: free-text note carried on the coin note itself.

---

### offlineGrace?

> `optional` **offlineGrace?**: `string`

Defined in: [types/cli.ts:2194](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2194)

Complete-mode lease shape.

---

### heartbeat?

> `optional` **heartbeat?**: `string`

Defined in: [types/cli.ts:2195](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2195)

---

### leaseTtl?

> `optional` **leaseTtl?**: `string`

Defined in: [types/cli.ts:2196](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2196)

---

### publicUrl?

> `optional` **publicUrl?**: `string`

Defined in: [types/cli.ts:2198](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2198)

Public URL this node is reachable at, used to mint a share link.

---

### level?

> `optional` **level?**: `string`

Defined in: [types/cli.ts:2199](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2199)

---

### preset?

> `optional` **preset?**: `string`

Defined in: [types/cli.ts:2200](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2200)

---

### ledger?

> `optional` **ledger?**: `string`

Defined in: [types/cli.ts:2201](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2201)

---

### coins?

> `optional` **coins?**: `number`

Defined in: [types/cli.ts:2202](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2202)

---

### refill?

> `optional` **refill?**: `string`

Defined in: [types/cli.ts:2203](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2203)

---

### maxSlice?

> `optional` **maxSlice?**: `string`

Defined in: [types/cli.ts:2204](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2204)

---

### maxSlicePerAccount?

> `optional` **maxSlicePerAccount?**: `string`

Defined in: [types/cli.ts:2205](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2205)

---

### reserve?

> `optional` **reserve?**: `string`

Defined in: [types/cli.ts:2206](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2206)

---

### spillover?

> `optional` **spillover?**: `string`

Defined in: [types/cli.ts:2207](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2207)

---

### models?

> `optional` **models?**: `string`[]

Defined in: [types/cli.ts:2208](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2208)

---

### accounts?

> `optional` **accounts?**: `string`[]

Defined in: [types/cli.ts:2209](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2209)

---

### rate?

> `optional` **rate?**: `string`

Defined in: [types/cli.ts:2210](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2210)

---

### concurrency?

> `optional` **concurrency?**: `number`

Defined in: [types/cli.ts:2211](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2211)

---

### schedule?

> `optional` **schedule?**: `string`

Defined in: [types/cli.ts:2212](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2212)

---

### expires?

> `optional` **expires?**: `string`

Defined in: [types/cli.ts:2213](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2213)

---

### note?

> `optional` **note?**: `string`

Defined in: [types/cli.ts:2214](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2214)

---

### to?

> `optional` **to?**: `string`

Defined in: [types/cli.ts:2215](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2215)

---

### json?

> `optional` **json?**: `boolean`

Defined in: [types/cli.ts:2216](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2216)

---

### dev?

> `optional` **dev?**: `boolean`

Defined in: [types/cli.ts:2217](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2217)
