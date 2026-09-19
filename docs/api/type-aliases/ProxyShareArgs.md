[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareArgs

# Type Alias: ProxyShareArgs

> **ProxyShareArgs** = `object`

Defined in: [types/cli.ts:2217](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2217)

## Properties

### action?

> `optional` **action?**: [`ProxyShareCliAction`](ProxyShareCliAction.md)

Defined in: [types/cli.ts:2218](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2218)

---

### value?

> `optional` **value?**: `string`

Defined in: [types/cli.ts:2220](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2220)

Positional argument for actions that take one, e.g. `share url <url>`.

---

### clear?

> `optional` **clear?**: `boolean`

Defined in: [types/cli.ts:2222](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2222)

`share url --clear`: forget this node's recorded public address.

---

### peer?

> `optional` **peer?**: `string`

Defined in: [types/cli.ts:2223](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2223)

---

### fromAccount?

> `optional` **fromAccount?**: `string`

Defined in: [types/cli.ts:2225](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2225)

Lender account a complete share is minted from, for drift auditing.

---

### code?

> `optional` **code?**: `string`

Defined in: [types/cli.ts:2227](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2227)

Authorization code from the lender's browser, for split provisioning.

---

### ttl?

> `optional` **ttl?**: `string`

Defined in: [types/cli.ts:2229](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2229)

`share note`: how long the note stays redeemable.

---

### memo?

> `optional` **memo?**: `string`

Defined in: [types/cli.ts:2231](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2231)

`share note`: free-text note carried on the coin note itself.

---

### offlineGrace?

> `optional` **offlineGrace?**: `string`

Defined in: [types/cli.ts:2233](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2233)

Complete-mode lease shape.

---

### heartbeat?

> `optional` **heartbeat?**: `string`

Defined in: [types/cli.ts:2234](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2234)

---

### leaseTtl?

> `optional` **leaseTtl?**: `string`

Defined in: [types/cli.ts:2235](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2235)

---

### publicUrl?

> `optional` **publicUrl?**: `string`

Defined in: [types/cli.ts:2237](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2237)

Public URL this node is reachable at, used to mint a share link.

---

### level?

> `optional` **level?**: `string`

Defined in: [types/cli.ts:2238](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2238)

---

### preset?

> `optional` **preset?**: `string`

Defined in: [types/cli.ts:2239](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2239)

---

### ledger?

> `optional` **ledger?**: `string`

Defined in: [types/cli.ts:2240](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2240)

---

### coins?

> `optional` **coins?**: `number`

Defined in: [types/cli.ts:2241](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2241)

---

### refill?

> `optional` **refill?**: `string`

Defined in: [types/cli.ts:2242](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2242)

---

### maxSlice?

> `optional` **maxSlice?**: `string`

Defined in: [types/cli.ts:2243](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2243)

---

### maxSlicePerAccount?

> `optional` **maxSlicePerAccount?**: `string`

Defined in: [types/cli.ts:2244](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2244)

---

### reserve?

> `optional` **reserve?**: `string`

Defined in: [types/cli.ts:2245](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2245)

---

### spillover?

> `optional` **spillover?**: `string`

Defined in: [types/cli.ts:2246](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2246)

---

### models?

> `optional` **models?**: `string`[]

Defined in: [types/cli.ts:2247](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2247)

---

### accounts?

> `optional` **accounts?**: `string`[]

Defined in: [types/cli.ts:2248](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2248)

---

### rate?

> `optional` **rate?**: `string`

Defined in: [types/cli.ts:2249](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2249)

---

### concurrency?

> `optional` **concurrency?**: `number`

Defined in: [types/cli.ts:2250](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2250)

---

### schedule?

> `optional` **schedule?**: `string`

Defined in: [types/cli.ts:2251](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2251)

---

### expires?

> `optional` **expires?**: `string`

Defined in: [types/cli.ts:2252](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2252)

---

### note?

> `optional` **note?**: `string`

Defined in: [types/cli.ts:2253](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2253)

---

### to?

> `optional` **to?**: `string`

Defined in: [types/cli.ts:2254](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2254)

---

### json?

> `optional` **json?**: `boolean`

Defined in: [types/cli.ts:2255](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2255)

---

### dev?

> `optional` **dev?**: `boolean`

Defined in: [types/cli.ts:2256](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2256)
