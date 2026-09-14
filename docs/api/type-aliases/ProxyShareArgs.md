[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareArgs

# Type Alias: ProxyShareArgs

> **ProxyShareArgs** = `object`

Defined in: [types/cli.ts:2159](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2159)

## Properties

### action?

> `optional` **action?**: [`ProxyShareCliAction`](ProxyShareCliAction.md)

Defined in: [types/cli.ts:2160](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2160)

---

### value?

> `optional` **value?**: `string`

Defined in: [types/cli.ts:2162](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2162)

Positional argument for actions that take one, e.g. `share url <url>`.

---

### clear?

> `optional` **clear?**: `boolean`

Defined in: [types/cli.ts:2164](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2164)

`share url --clear`: forget this node's recorded public address.

---

### peer?

> `optional` **peer?**: `string`

Defined in: [types/cli.ts:2165](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2165)

---

### fromAccount?

> `optional` **fromAccount?**: `string`

Defined in: [types/cli.ts:2167](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2167)

Lender account a complete share is minted from, for drift auditing.

---

### code?

> `optional` **code?**: `string`

Defined in: [types/cli.ts:2169](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2169)

Authorization code from the lender's browser, for split provisioning.

---

### ttl?

> `optional` **ttl?**: `string`

Defined in: [types/cli.ts:2171](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2171)

`share note`: how long the note stays redeemable.

---

### memo?

> `optional` **memo?**: `string`

Defined in: [types/cli.ts:2173](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2173)

`share note`: free-text note carried on the coin note itself.

---

### offlineGrace?

> `optional` **offlineGrace?**: `string`

Defined in: [types/cli.ts:2175](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2175)

Complete-mode lease shape.

---

### heartbeat?

> `optional` **heartbeat?**: `string`

Defined in: [types/cli.ts:2176](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2176)

---

### leaseTtl?

> `optional` **leaseTtl?**: `string`

Defined in: [types/cli.ts:2177](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2177)

---

### publicUrl?

> `optional` **publicUrl?**: `string`

Defined in: [types/cli.ts:2179](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2179)

Public URL this node is reachable at, used to mint a share link.

---

### level?

> `optional` **level?**: `string`

Defined in: [types/cli.ts:2180](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2180)

---

### preset?

> `optional` **preset?**: `string`

Defined in: [types/cli.ts:2181](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2181)

---

### ledger?

> `optional` **ledger?**: `string`

Defined in: [types/cli.ts:2182](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2182)

---

### coins?

> `optional` **coins?**: `number`

Defined in: [types/cli.ts:2183](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2183)

---

### refill?

> `optional` **refill?**: `string`

Defined in: [types/cli.ts:2184](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2184)

---

### maxSlice?

> `optional` **maxSlice?**: `string`

Defined in: [types/cli.ts:2185](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2185)

---

### maxSlicePerAccount?

> `optional` **maxSlicePerAccount?**: `string`

Defined in: [types/cli.ts:2186](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2186)

---

### reserve?

> `optional` **reserve?**: `string`

Defined in: [types/cli.ts:2187](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2187)

---

### spillover?

> `optional` **spillover?**: `string`

Defined in: [types/cli.ts:2188](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2188)

---

### models?

> `optional` **models?**: `string`[]

Defined in: [types/cli.ts:2189](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2189)

---

### accounts?

> `optional` **accounts?**: `string`[]

Defined in: [types/cli.ts:2190](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2190)

---

### rate?

> `optional` **rate?**: `string`

Defined in: [types/cli.ts:2191](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2191)

---

### concurrency?

> `optional` **concurrency?**: `number`

Defined in: [types/cli.ts:2192](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2192)

---

### schedule?

> `optional` **schedule?**: `string`

Defined in: [types/cli.ts:2193](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2193)

---

### expires?

> `optional` **expires?**: `string`

Defined in: [types/cli.ts:2194](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2194)

---

### note?

> `optional` **note?**: `string`

Defined in: [types/cli.ts:2195](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2195)

---

### to?

> `optional` **to?**: `string`

Defined in: [types/cli.ts:2196](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2196)

---

### json?

> `optional` **json?**: `boolean`

Defined in: [types/cli.ts:2197](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2197)

---

### dev?

> `optional` **dev?**: `boolean`

Defined in: [types/cli.ts:2198](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2198)
