[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AuthListRefreshOutcome

# Type Alias: AuthListRefreshOutcome

> **AuthListRefreshOutcome** = `object`

Defined in: [types/cli.ts:1115](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1115)

Outcome of the `auth list --refresh` fresh-limit fetch.

## Properties

### via

> **via**: `"proxy"` \| `"direct"` \| `"none"`

Defined in: [types/cli.ts:1117](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1117)

How the fresh limits were obtained ("none" when every path failed).

---

### quotas

> **quotas**: `Record`\<`string`, [`AccountQuota`](AccountQuota.md)\> \| `null`

Defined in: [types/cli.ts:1119](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1119)

Freshly fetched quotas keyed by account label; null when none fetched.

---

### errors

> **errors**: `string`[]

Defined in: [types/cli.ts:1121](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1121)

Per-account and transport errors, already formatted for display.
