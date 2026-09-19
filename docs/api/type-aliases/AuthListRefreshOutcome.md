[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AuthListRefreshOutcome

# Type Alias: AuthListRefreshOutcome

> **AuthListRefreshOutcome** = `object`

Defined in: [types/cli.ts:1179](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1179)

Outcome of the `auth list --refresh` fresh-limit fetch.

## Properties

### via

> **via**: `"proxy"` \| `"direct"` \| `"mixed"` \| `"none"`

Defined in: [types/cli.ts:1181](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1181)

How the fresh limits were obtained ("none" when every path failed).

---

### quotas

> **quotas**: `Record`\<`string`, [`AccountQuota`](AccountQuota.md)\> \| `null`

Defined in: [types/cli.ts:1183](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1183)

Freshly fetched quotas keyed by provider-qualified account key.

---

### accounts

> **accounts**: `Record`\<`string`, [`AuthListRefreshAccountResult`](AuthListRefreshAccountResult.md)\>

Defined in: [types/cli.ts:1185](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1185)

Per-account refresh status, also keyed by provider-qualified account key.

---

### errors

> **errors**: `string`[]

Defined in: [types/cli.ts:1187](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1187)

Per-account and transport errors, already formatted for display.
