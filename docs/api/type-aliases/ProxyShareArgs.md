[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareArgs

# Type Alias: ProxyShareArgs

> **ProxyShareArgs** = `object`

Defined in: [types/cli.ts:2198](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2198)

## Properties

### action?

> `optional` **action?**: [`ProxyShareCliAction`](ProxyShareCliAction.md)

Defined in: [types/cli.ts:2199](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2199)

---

### value?

> `optional` **value?**: `string`

Defined in: [types/cli.ts:2201](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2201)

Positional argument for actions that take one, e.g. `share url <url>`.

---

### clear?

> `optional` **clear?**: `boolean`

Defined in: [types/cli.ts:2203](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2203)

`share url --clear`: forget this node's recorded public address.

---

### peer?

> `optional` **peer?**: `string`

Defined in: [types/cli.ts:2204](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2204)

---

### fromAccount?

> `optional` **fromAccount?**: `string`

Defined in: [types/cli.ts:2206](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2206)

Lender account a complete share is minted from, for drift auditing.

---

### code?

> `optional` **code?**: `string`

Defined in: [types/cli.ts:2208](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2208)

Authorization code from the lender's browser, for split provisioning.

---

### ttl?

> `optional` **ttl?**: `string`

Defined in: [types/cli.ts:2210](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2210)

`share note`: how long the note stays redeemable.

---

### memo?

> `optional` **memo?**: `string`

Defined in: [types/cli.ts:2212](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2212)

`share note`: free-text note carried on the coin note itself.

---

### offlineGrace?

> `optional` **offlineGrace?**: `string`

Defined in: [types/cli.ts:2214](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2214)

Complete-mode lease shape.

---

### heartbeat?

> `optional` **heartbeat?**: `string`

Defined in: [types/cli.ts:2215](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2215)

---

### leaseTtl?

> `optional` **leaseTtl?**: `string`

Defined in: [types/cli.ts:2216](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2216)

---

### publicUrl?

> `optional` **publicUrl?**: `string`

Defined in: [types/cli.ts:2218](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2218)

Public URL this node is reachable at, used to mint a share link.

---

### level?

> `optional` **level?**: `string`

Defined in: [types/cli.ts:2219](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2219)

---

### preset?

> `optional` **preset?**: `string`

Defined in: [types/cli.ts:2220](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2220)

---

### ledger?

> `optional` **ledger?**: `string`

Defined in: [types/cli.ts:2221](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2221)

---

### coins?

> `optional` **coins?**: `number`

Defined in: [types/cli.ts:2222](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2222)

---

### refill?

> `optional` **refill?**: `string`

Defined in: [types/cli.ts:2223](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2223)

---

### maxSlice?

> `optional` **maxSlice?**: `string`

Defined in: [types/cli.ts:2224](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2224)

---

### maxSlicePerAccount?

> `optional` **maxSlicePerAccount?**: `string`

Defined in: [types/cli.ts:2225](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2225)

---

### reserve?

> `optional` **reserve?**: `string`

Defined in: [types/cli.ts:2226](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2226)

---

### spillover?

> `optional` **spillover?**: `string`

Defined in: [types/cli.ts:2227](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2227)

---

### models?

> `optional` **models?**: `string`[]

Defined in: [types/cli.ts:2228](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2228)

---

### accounts?

> `optional` **accounts?**: `string`[]

Defined in: [types/cli.ts:2229](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2229)

---

### rate?

> `optional` **rate?**: `string`

Defined in: [types/cli.ts:2230](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2230)

---

### concurrency?

> `optional` **concurrency?**: `number`

Defined in: [types/cli.ts:2231](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2231)

---

### schedule?

> `optional` **schedule?**: `string`

Defined in: [types/cli.ts:2232](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2232)

---

### expires?

> `optional` **expires?**: `string`

Defined in: [types/cli.ts:2233](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2233)

---

### note?

> `optional` **note?**: `string`

Defined in: [types/cli.ts:2234](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2234)

---

### to?

> `optional` **to?**: `string`

Defined in: [types/cli.ts:2235](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2235)

---

### json?

> `optional` **json?**: `boolean`

Defined in: [types/cli.ts:2236](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2236)

---

### dev?

> `optional` **dev?**: `boolean`

Defined in: [types/cli.ts:2237](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2237)
