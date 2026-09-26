[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareArgs

# Type Alias: ProxyShareArgs

> **ProxyShareArgs** = `object`

Defined in: [types/cli.ts:2236](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2236)

## Properties

### action?

> `optional` **action?**: [`ProxyShareCliAction`](ProxyShareCliAction.md)

Defined in: [types/cli.ts:2237](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2237)

---

### value?

> `optional` **value?**: `string`

Defined in: [types/cli.ts:2239](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2239)

Positional argument for actions that take one, e.g. `share url <url>`.

---

### clear?

> `optional` **clear?**: `boolean`

Defined in: [types/cli.ts:2241](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2241)

`share url --clear`: forget this node's recorded public address.

---

### peer?

> `optional` **peer?**: `string`

Defined in: [types/cli.ts:2242](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2242)

---

### fromAccount?

> `optional` **fromAccount?**: `string`

Defined in: [types/cli.ts:2244](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2244)

Lender account a complete share is minted from, for drift auditing.

---

### code?

> `optional` **code?**: `string`

Defined in: [types/cli.ts:2246](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2246)

Authorization code from the lender's browser, for split provisioning.

---

### ttl?

> `optional` **ttl?**: `string`

Defined in: [types/cli.ts:2248](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2248)

`share note`: how long the note stays redeemable.

---

### memo?

> `optional` **memo?**: `string`

Defined in: [types/cli.ts:2250](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2250)

`share note`: free-text note carried on the coin note itself.

---

### offlineGrace?

> `optional` **offlineGrace?**: `string`

Defined in: [types/cli.ts:2252](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2252)

Complete-mode lease shape.

---

### heartbeat?

> `optional` **heartbeat?**: `string`

Defined in: [types/cli.ts:2253](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2253)

---

### leaseTtl?

> `optional` **leaseTtl?**: `string`

Defined in: [types/cli.ts:2254](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2254)

---

### publicUrl?

> `optional` **publicUrl?**: `string`

Defined in: [types/cli.ts:2256](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2256)

Public URL this node is reachable at, used to mint a share link.

---

### level?

> `optional` **level?**: `string`

Defined in: [types/cli.ts:2257](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2257)

---

### preset?

> `optional` **preset?**: `string`

Defined in: [types/cli.ts:2258](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2258)

---

### ledger?

> `optional` **ledger?**: `string`

Defined in: [types/cli.ts:2259](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2259)

---

### coins?

> `optional` **coins?**: `number`

Defined in: [types/cli.ts:2260](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2260)

---

### refill?

> `optional` **refill?**: `string`

Defined in: [types/cli.ts:2261](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2261)

---

### maxSlice?

> `optional` **maxSlice?**: `string`

Defined in: [types/cli.ts:2262](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2262)

---

### maxSlicePerAccount?

> `optional` **maxSlicePerAccount?**: `string`

Defined in: [types/cli.ts:2263](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2263)

---

### reserve?

> `optional` **reserve?**: `string`

Defined in: [types/cli.ts:2264](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2264)

---

### spillover?

> `optional` **spillover?**: `string`

Defined in: [types/cli.ts:2265](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2265)

---

### models?

> `optional` **models?**: `string`[]

Defined in: [types/cli.ts:2266](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2266)

---

### accounts?

> `optional` **accounts?**: `string`[]

Defined in: [types/cli.ts:2267](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2267)

---

### rate?

> `optional` **rate?**: `string`

Defined in: [types/cli.ts:2268](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2268)

---

### concurrency?

> `optional` **concurrency?**: `number`

Defined in: [types/cli.ts:2269](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2269)

---

### schedule?

> `optional` **schedule?**: `string`

Defined in: [types/cli.ts:2270](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2270)

---

### expires?

> `optional` **expires?**: `string`

Defined in: [types/cli.ts:2271](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2271)

---

### note?

> `optional` **note?**: `string`

Defined in: [types/cli.ts:2272](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2272)

---

### to?

> `optional` **to?**: `string`

Defined in: [types/cli.ts:2273](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2273)

---

### json?

> `optional` **json?**: `boolean`

Defined in: [types/cli.ts:2274](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2274)

---

### dev?

> `optional` **dev?**: `boolean`

Defined in: [types/cli.ts:2275](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2275)
