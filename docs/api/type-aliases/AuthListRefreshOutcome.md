[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AuthListRefreshOutcome

# Type Alias: AuthListRefreshOutcome

> **AuthListRefreshOutcome** = `object`

Defined in: [types/cli.ts:1111](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1111)

Outcome of the `auth list --refresh` fresh-limit fetch.

## Properties

### via

> **via**: `"proxy"` \| `"direct"` \| `"none"`

Defined in: [types/cli.ts:1113](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1113)

How the fresh limits were obtained ("none" when every path failed).

---

### quotas

> **quotas**: `Record`\<`string`, [`AccountQuota`](AccountQuota.md)\> \| `null`

Defined in: [types/cli.ts:1115](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1115)

Freshly fetched quotas keyed by account label; null when none fetched.

---

### errors

> **errors**: `string`[]

Defined in: [types/cli.ts:1117](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1117)

Per-account and transport errors, already formatted for display.
