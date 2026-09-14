[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareArgs

# Type Alias: ProxyShareArgs

> **ProxyShareArgs** = `object`

Defined in: [types/cli.ts:2147](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2147)

## Properties

### action?

> `optional` **action?**: [`ProxyShareCliAction`](ProxyShareCliAction.md)

Defined in: [types/cli.ts:2148](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2148)

---

### value?

> `optional` **value?**: `string`

Defined in: [types/cli.ts:2150](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2150)

Positional argument for actions that take one, e.g. `share url <url>`.

---

### clear?

> `optional` **clear?**: `boolean`

Defined in: [types/cli.ts:2152](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2152)

`share url --clear`: forget this node's recorded public address.

---

### peer?

> `optional` **peer?**: `string`

Defined in: [types/cli.ts:2153](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2153)

---

### fromAccount?

> `optional` **fromAccount?**: `string`

Defined in: [types/cli.ts:2155](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2155)

Lender account a complete share is minted from, for drift auditing.

---

### code?

> `optional` **code?**: `string`

Defined in: [types/cli.ts:2157](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2157)

Authorization code from the lender's browser, for split provisioning.

---

### ttl?

> `optional` **ttl?**: `string`

Defined in: [types/cli.ts:2159](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2159)

`share note`: how long the note stays redeemable.

---

### memo?

> `optional` **memo?**: `string`

Defined in: [types/cli.ts:2161](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2161)

`share note`: free-text note carried on the coin note itself.

---

### offlineGrace?

> `optional` **offlineGrace?**: `string`

Defined in: [types/cli.ts:2163](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2163)

Complete-mode lease shape.

---

### heartbeat?

> `optional` **heartbeat?**: `string`

Defined in: [types/cli.ts:2164](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2164)

---

### leaseTtl?

> `optional` **leaseTtl?**: `string`

Defined in: [types/cli.ts:2165](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2165)

---

### publicUrl?

> `optional` **publicUrl?**: `string`

Defined in: [types/cli.ts:2167](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2167)

Public URL this node is reachable at, used to mint a share link.

---

### level?

> `optional` **level?**: `string`

Defined in: [types/cli.ts:2168](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2168)

---

### preset?

> `optional` **preset?**: `string`

Defined in: [types/cli.ts:2169](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2169)

---

### ledger?

> `optional` **ledger?**: `string`

Defined in: [types/cli.ts:2170](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2170)

---

### coins?

> `optional` **coins?**: `number`

Defined in: [types/cli.ts:2171](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2171)

---

### refill?

> `optional` **refill?**: `string`

Defined in: [types/cli.ts:2172](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2172)

---

### maxSlice?

> `optional` **maxSlice?**: `string`

Defined in: [types/cli.ts:2173](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2173)

---

### maxSlicePerAccount?

> `optional` **maxSlicePerAccount?**: `string`

Defined in: [types/cli.ts:2174](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2174)

---

### reserve?

> `optional` **reserve?**: `string`

Defined in: [types/cli.ts:2175](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2175)

---

### spillover?

> `optional` **spillover?**: `string`

Defined in: [types/cli.ts:2176](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2176)

---

### models?

> `optional` **models?**: `string`[]

Defined in: [types/cli.ts:2177](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2177)

---

### accounts?

> `optional` **accounts?**: `string`[]

Defined in: [types/cli.ts:2178](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2178)

---

### rate?

> `optional` **rate?**: `string`

Defined in: [types/cli.ts:2179](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2179)

---

### concurrency?

> `optional` **concurrency?**: `number`

Defined in: [types/cli.ts:2180](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2180)

---

### schedule?

> `optional` **schedule?**: `string`

Defined in: [types/cli.ts:2181](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2181)

---

### expires?

> `optional` **expires?**: `string`

Defined in: [types/cli.ts:2182](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2182)

---

### note?

> `optional` **note?**: `string`

Defined in: [types/cli.ts:2183](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2183)

---

### to?

> `optional` **to?**: `string`

Defined in: [types/cli.ts:2184](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2184)

---

### json?

> `optional` **json?**: `boolean`

Defined in: [types/cli.ts:2185](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2185)

---

### dev?

> `optional` **dev?**: `boolean`

Defined in: [types/cli.ts:2186](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2186)
