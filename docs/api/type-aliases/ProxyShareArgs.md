[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareArgs

# Type Alias: ProxyShareArgs

> **ProxyShareArgs** = `object`

Defined in: [types/cli.ts:2218](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2218)

## Properties

### action?

> `optional` **action?**: [`ProxyShareCliAction`](ProxyShareCliAction.md)

Defined in: [types/cli.ts:2219](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2219)

---

### value?

> `optional` **value?**: `string`

Defined in: [types/cli.ts:2221](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2221)

Positional argument for actions that take one, e.g. `share url <url>`.

---

### clear?

> `optional` **clear?**: `boolean`

Defined in: [types/cli.ts:2223](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2223)

`share url --clear`: forget this node's recorded public address.

---

### peer?

> `optional` **peer?**: `string`

Defined in: [types/cli.ts:2224](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2224)

---

### fromAccount?

> `optional` **fromAccount?**: `string`

Defined in: [types/cli.ts:2226](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2226)

Lender account a complete share is minted from, for drift auditing.

---

### code?

> `optional` **code?**: `string`

Defined in: [types/cli.ts:2228](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2228)

Authorization code from the lender's browser, for split provisioning.

---

### ttl?

> `optional` **ttl?**: `string`

Defined in: [types/cli.ts:2230](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2230)

`share note`: how long the note stays redeemable.

---

### memo?

> `optional` **memo?**: `string`

Defined in: [types/cli.ts:2232](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2232)

`share note`: free-text note carried on the coin note itself.

---

### offlineGrace?

> `optional` **offlineGrace?**: `string`

Defined in: [types/cli.ts:2234](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2234)

Complete-mode lease shape.

---

### heartbeat?

> `optional` **heartbeat?**: `string`

Defined in: [types/cli.ts:2235](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2235)

---

### leaseTtl?

> `optional` **leaseTtl?**: `string`

Defined in: [types/cli.ts:2236](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2236)

---

### publicUrl?

> `optional` **publicUrl?**: `string`

Defined in: [types/cli.ts:2238](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2238)

Public URL this node is reachable at, used to mint a share link.

---

### level?

> `optional` **level?**: `string`

Defined in: [types/cli.ts:2239](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2239)

---

### preset?

> `optional` **preset?**: `string`

Defined in: [types/cli.ts:2240](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2240)

---

### ledger?

> `optional` **ledger?**: `string`

Defined in: [types/cli.ts:2241](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2241)

---

### coins?

> `optional` **coins?**: `number`

Defined in: [types/cli.ts:2242](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2242)

---

### refill?

> `optional` **refill?**: `string`

Defined in: [types/cli.ts:2243](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2243)

---

### maxSlice?

> `optional` **maxSlice?**: `string`

Defined in: [types/cli.ts:2244](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2244)

---

### maxSlicePerAccount?

> `optional` **maxSlicePerAccount?**: `string`

Defined in: [types/cli.ts:2245](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2245)

---

### reserve?

> `optional` **reserve?**: `string`

Defined in: [types/cli.ts:2246](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2246)

---

### spillover?

> `optional` **spillover?**: `string`

Defined in: [types/cli.ts:2247](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2247)

---

### models?

> `optional` **models?**: `string`[]

Defined in: [types/cli.ts:2248](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2248)

---

### accounts?

> `optional` **accounts?**: `string`[]

Defined in: [types/cli.ts:2249](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2249)

---

### rate?

> `optional` **rate?**: `string`

Defined in: [types/cli.ts:2250](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2250)

---

### concurrency?

> `optional` **concurrency?**: `number`

Defined in: [types/cli.ts:2251](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2251)

---

### schedule?

> `optional` **schedule?**: `string`

Defined in: [types/cli.ts:2252](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2252)

---

### expires?

> `optional` **expires?**: `string`

Defined in: [types/cli.ts:2253](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2253)

---

### note?

> `optional` **note?**: `string`

Defined in: [types/cli.ts:2254](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2254)

---

### to?

> `optional` **to?**: `string`

Defined in: [types/cli.ts:2255](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2255)

---

### json?

> `optional` **json?**: `boolean`

Defined in: [types/cli.ts:2256](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2256)

---

### dev?

> `optional` **dev?**: `boolean`

Defined in: [types/cli.ts:2257](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2257)
