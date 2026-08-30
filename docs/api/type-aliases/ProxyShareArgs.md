[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareArgs

# Type Alias: ProxyShareArgs

> **ProxyShareArgs** = `object`

Defined in: [types/cli.ts:2140](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2140)

## Properties

### action?

> `optional` **action?**: [`ProxyShareCliAction`](ProxyShareCliAction.md)

Defined in: [types/cli.ts:2141](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2141)

---

### value?

> `optional` **value?**: `string`

Defined in: [types/cli.ts:2143](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2143)

Positional argument for actions that take one, e.g. `share url <url>`.

---

### clear?

> `optional` **clear?**: `boolean`

Defined in: [types/cli.ts:2145](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2145)

`share url --clear`: forget this node's recorded public address.

---

### peer?

> `optional` **peer?**: `string`

Defined in: [types/cli.ts:2146](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2146)

---

### fromAccount?

> `optional` **fromAccount?**: `string`

Defined in: [types/cli.ts:2148](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2148)

Lender account a complete share is minted from, for drift auditing.

---

### code?

> `optional` **code?**: `string`

Defined in: [types/cli.ts:2150](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2150)

Authorization code from the lender's browser, for split provisioning.

---

### ttl?

> `optional` **ttl?**: `string`

Defined in: [types/cli.ts:2152](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2152)

`share note`: how long the note stays redeemable.

---

### memo?

> `optional` **memo?**: `string`

Defined in: [types/cli.ts:2154](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2154)

`share note`: free-text note carried on the coin note itself.

---

### offlineGrace?

> `optional` **offlineGrace?**: `string`

Defined in: [types/cli.ts:2156](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2156)

Complete-mode lease shape.

---

### heartbeat?

> `optional` **heartbeat?**: `string`

Defined in: [types/cli.ts:2157](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2157)

---

### leaseTtl?

> `optional` **leaseTtl?**: `string`

Defined in: [types/cli.ts:2158](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2158)

---

### publicUrl?

> `optional` **publicUrl?**: `string`

Defined in: [types/cli.ts:2160](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2160)

Public URL this node is reachable at, used to mint a share link.

---

### level?

> `optional` **level?**: `string`

Defined in: [types/cli.ts:2161](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2161)

---

### preset?

> `optional` **preset?**: `string`

Defined in: [types/cli.ts:2162](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2162)

---

### ledger?

> `optional` **ledger?**: `string`

Defined in: [types/cli.ts:2163](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2163)

---

### coins?

> `optional` **coins?**: `number`

Defined in: [types/cli.ts:2164](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2164)

---

### refill?

> `optional` **refill?**: `string`

Defined in: [types/cli.ts:2165](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2165)

---

### maxSlice?

> `optional` **maxSlice?**: `string`

Defined in: [types/cli.ts:2166](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2166)

---

### maxSlicePerAccount?

> `optional` **maxSlicePerAccount?**: `string`

Defined in: [types/cli.ts:2167](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2167)

---

### reserve?

> `optional` **reserve?**: `string`

Defined in: [types/cli.ts:2168](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2168)

---

### spillover?

> `optional` **spillover?**: `string`

Defined in: [types/cli.ts:2169](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2169)

---

### models?

> `optional` **models?**: `string`[]

Defined in: [types/cli.ts:2170](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2170)

---

### accounts?

> `optional` **accounts?**: `string`[]

Defined in: [types/cli.ts:2171](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2171)

---

### rate?

> `optional` **rate?**: `string`

Defined in: [types/cli.ts:2172](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2172)

---

### concurrency?

> `optional` **concurrency?**: `number`

Defined in: [types/cli.ts:2173](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2173)

---

### schedule?

> `optional` **schedule?**: `string`

Defined in: [types/cli.ts:2174](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2174)

---

### expires?

> `optional` **expires?**: `string`

Defined in: [types/cli.ts:2175](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2175)

---

### note?

> `optional` **note?**: `string`

Defined in: [types/cli.ts:2176](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2176)

---

### to?

> `optional` **to?**: `string`

Defined in: [types/cli.ts:2177](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2177)

---

### json?

> `optional` **json?**: `boolean`

Defined in: [types/cli.ts:2178](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2178)

---

### dev?

> `optional` **dev?**: `boolean`

Defined in: [types/cli.ts:2179](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2179)
