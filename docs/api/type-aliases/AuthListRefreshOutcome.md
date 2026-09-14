[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AuthListRefreshOutcome

# Type Alias: AuthListRefreshOutcome

> **AuthListRefreshOutcome** = `object`

Defined in: [types/cli.ts:1174](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1174)

Outcome of the `auth list --refresh` fresh-limit fetch.

## Properties

### via

> **via**: `"proxy"` \| `"direct"` \| `"mixed"` \| `"none"`

Defined in: [types/cli.ts:1176](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1176)

How the fresh limits were obtained ("none" when every path failed).

---

### quotas

> **quotas**: `Record`\<`string`, [`AccountQuota`](AccountQuota.md)\> \| `null`

Defined in: [types/cli.ts:1178](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1178)

Freshly fetched quotas keyed by provider-qualified account key.

---

### accounts

> **accounts**: `Record`\<`string`, [`AuthListRefreshAccountResult`](AuthListRefreshAccountResult.md)\>

Defined in: [types/cli.ts:1180](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1180)

Per-account refresh status, also keyed by provider-qualified account key.

---

### errors

> **errors**: `string`[]

Defined in: [types/cli.ts:1182](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1182)

Per-account and transport errors, already formatted for display.
