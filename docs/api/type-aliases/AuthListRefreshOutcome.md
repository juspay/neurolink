[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AuthListRefreshOutcome

# Type Alias: AuthListRefreshOutcome

> **AuthListRefreshOutcome** = `object`

Defined in: [types/cli.ts:1162](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1162)

Outcome of the `auth list --refresh` fresh-limit fetch.

## Properties

### via

> **via**: `"proxy"` \| `"direct"` \| `"mixed"` \| `"none"`

Defined in: [types/cli.ts:1164](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1164)

How the fresh limits were obtained ("none" when every path failed).

---

### quotas

> **quotas**: `Record`\<`string`, [`AccountQuota`](AccountQuota.md)\> \| `null`

Defined in: [types/cli.ts:1166](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1166)

Freshly fetched quotas keyed by provider-qualified account key.

---

### accounts

> **accounts**: `Record`\<`string`, [`AuthListRefreshAccountResult`](AuthListRefreshAccountResult.md)\>

Defined in: [types/cli.ts:1168](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1168)

Per-account refresh status, also keyed by provider-qualified account key.

---

### errors

> **errors**: `string`[]

Defined in: [types/cli.ts:1170](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1170)

Per-account and transport errors, already formatted for display.
