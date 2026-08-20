[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareArgs

# Type Alias: ProxyShareArgs

> **ProxyShareArgs** = `object`

Defined in: [types/cli.ts:2098](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2098)

## Properties

### action?

> `optional` **action?**: [`ProxyShareCliAction`](ProxyShareCliAction.md)

Defined in: [types/cli.ts:2099](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2099)

---

### value?

> `optional` **value?**: `string`

Defined in: [types/cli.ts:2101](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2101)

Positional argument for actions that take one, e.g. `share url <url>`.

---

### clear?

> `optional` **clear?**: `boolean`

Defined in: [types/cli.ts:2103](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2103)

`share url --clear`: forget this node's recorded public address.

---

### peer?

> `optional` **peer?**: `string`

Defined in: [types/cli.ts:2104](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2104)

---

### fromAccount?

> `optional` **fromAccount?**: `string`

Defined in: [types/cli.ts:2106](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2106)

Lender account a complete share is minted from, for drift auditing.

---

### code?

> `optional` **code?**: `string`

Defined in: [types/cli.ts:2108](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2108)

Authorization code from the lender's browser, for split provisioning.

---

### ttl?

> `optional` **ttl?**: `string`

Defined in: [types/cli.ts:2110](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2110)

`share note`: how long the note stays redeemable.

---

### memo?

> `optional` **memo?**: `string`

Defined in: [types/cli.ts:2112](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2112)

`share note`: free-text note carried on the coin note itself.

---

### offlineGrace?

> `optional` **offlineGrace?**: `string`

Defined in: [types/cli.ts:2114](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2114)

Complete-mode lease shape.

---

### heartbeat?

> `optional` **heartbeat?**: `string`

Defined in: [types/cli.ts:2115](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2115)

---

### leaseTtl?

> `optional` **leaseTtl?**: `string`

Defined in: [types/cli.ts:2116](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2116)

---

### publicUrl?

> `optional` **publicUrl?**: `string`

Defined in: [types/cli.ts:2118](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2118)

Public URL this node is reachable at, used to mint a share link.

---

### level?

> `optional` **level?**: `string`

Defined in: [types/cli.ts:2119](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2119)

---

### preset?

> `optional` **preset?**: `string`

Defined in: [types/cli.ts:2120](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2120)

---

### ledger?

> `optional` **ledger?**: `string`

Defined in: [types/cli.ts:2121](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2121)

---

### coins?

> `optional` **coins?**: `number`

Defined in: [types/cli.ts:2122](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2122)

---

### refill?

> `optional` **refill?**: `string`

Defined in: [types/cli.ts:2123](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2123)

---

### maxSlice?

> `optional` **maxSlice?**: `string`

Defined in: [types/cli.ts:2124](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2124)

---

### maxSlicePerAccount?

> `optional` **maxSlicePerAccount?**: `string`

Defined in: [types/cli.ts:2125](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2125)

---

### reserve?

> `optional` **reserve?**: `string`

Defined in: [types/cli.ts:2126](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2126)

---

### spillover?

> `optional` **spillover?**: `string`

Defined in: [types/cli.ts:2127](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2127)

---

### models?

> `optional` **models?**: `string`[]

Defined in: [types/cli.ts:2128](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2128)

---

### accounts?

> `optional` **accounts?**: `string`[]

Defined in: [types/cli.ts:2129](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2129)

---

### rate?

> `optional` **rate?**: `string`

Defined in: [types/cli.ts:2130](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2130)

---

### concurrency?

> `optional` **concurrency?**: `number`

Defined in: [types/cli.ts:2131](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2131)

---

### schedule?

> `optional` **schedule?**: `string`

Defined in: [types/cli.ts:2132](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2132)

---

### expires?

> `optional` **expires?**: `string`

Defined in: [types/cli.ts:2133](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2133)

---

### note?

> `optional` **note?**: `string`

Defined in: [types/cli.ts:2134](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2134)

---

### to?

> `optional` **to?**: `string`

Defined in: [types/cli.ts:2135](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2135)

---

### json?

> `optional` **json?**: `boolean`

Defined in: [types/cli.ts:2136](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2136)

---

### dev?

> `optional` **dev?**: `boolean`

Defined in: [types/cli.ts:2137](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2137)
