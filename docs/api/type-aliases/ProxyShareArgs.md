[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareArgs

# Type Alias: ProxyShareArgs

> **ProxyShareArgs** = `object`

Defined in: [types/cli.ts:2164](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2164)

## Properties

### action?

> `optional` **action?**: [`ProxyShareCliAction`](ProxyShareCliAction.md)

Defined in: [types/cli.ts:2165](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2165)

---

### value?

> `optional` **value?**: `string`

Defined in: [types/cli.ts:2167](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2167)

Positional argument for actions that take one, e.g. `share url <url>`.

---

### clear?

> `optional` **clear?**: `boolean`

Defined in: [types/cli.ts:2169](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2169)

`share url --clear`: forget this node's recorded public address.

---

### peer?

> `optional` **peer?**: `string`

Defined in: [types/cli.ts:2170](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2170)

---

### fromAccount?

> `optional` **fromAccount?**: `string`

Defined in: [types/cli.ts:2172](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2172)

Lender account a complete share is minted from, for drift auditing.

---

### code?

> `optional` **code?**: `string`

Defined in: [types/cli.ts:2174](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2174)

Authorization code from the lender's browser, for split provisioning.

---

### ttl?

> `optional` **ttl?**: `string`

Defined in: [types/cli.ts:2176](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2176)

`share note`: how long the note stays redeemable.

---

### memo?

> `optional` **memo?**: `string`

Defined in: [types/cli.ts:2178](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2178)

`share note`: free-text note carried on the coin note itself.

---

### offlineGrace?

> `optional` **offlineGrace?**: `string`

Defined in: [types/cli.ts:2180](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2180)

Complete-mode lease shape.

---

### heartbeat?

> `optional` **heartbeat?**: `string`

Defined in: [types/cli.ts:2181](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2181)

---

### leaseTtl?

> `optional` **leaseTtl?**: `string`

Defined in: [types/cli.ts:2182](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2182)

---

### publicUrl?

> `optional` **publicUrl?**: `string`

Defined in: [types/cli.ts:2184](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2184)

Public URL this node is reachable at, used to mint a share link.

---

### level?

> `optional` **level?**: `string`

Defined in: [types/cli.ts:2185](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2185)

---

### preset?

> `optional` **preset?**: `string`

Defined in: [types/cli.ts:2186](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2186)

---

### ledger?

> `optional` **ledger?**: `string`

Defined in: [types/cli.ts:2187](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2187)

---

### coins?

> `optional` **coins?**: `number`

Defined in: [types/cli.ts:2188](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2188)

---

### refill?

> `optional` **refill?**: `string`

Defined in: [types/cli.ts:2189](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2189)

---

### maxSlice?

> `optional` **maxSlice?**: `string`

Defined in: [types/cli.ts:2190](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2190)

---

### maxSlicePerAccount?

> `optional` **maxSlicePerAccount?**: `string`

Defined in: [types/cli.ts:2191](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2191)

---

### reserve?

> `optional` **reserve?**: `string`

Defined in: [types/cli.ts:2192](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2192)

---

### spillover?

> `optional` **spillover?**: `string`

Defined in: [types/cli.ts:2193](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2193)

---

### models?

> `optional` **models?**: `string`[]

Defined in: [types/cli.ts:2194](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2194)

---

### accounts?

> `optional` **accounts?**: `string`[]

Defined in: [types/cli.ts:2195](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2195)

---

### rate?

> `optional` **rate?**: `string`

Defined in: [types/cli.ts:2196](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2196)

---

### concurrency?

> `optional` **concurrency?**: `number`

Defined in: [types/cli.ts:2197](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2197)

---

### schedule?

> `optional` **schedule?**: `string`

Defined in: [types/cli.ts:2198](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2198)

---

### expires?

> `optional` **expires?**: `string`

Defined in: [types/cli.ts:2199](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2199)

---

### note?

> `optional` **note?**: `string`

Defined in: [types/cli.ts:2200](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2200)

---

### to?

> `optional` **to?**: `string`

Defined in: [types/cli.ts:2201](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2201)

---

### json?

> `optional` **json?**: `boolean`

Defined in: [types/cli.ts:2202](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2202)

---

### dev?

> `optional` **dev?**: `boolean`

Defined in: [types/cli.ts:2203](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2203)
