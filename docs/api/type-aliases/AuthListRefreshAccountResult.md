[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AuthListRefreshAccountResult

# Type Alias: AuthListRefreshAccountResult

> **AuthListRefreshAccountResult** = `object`

Defined in: [types/cli.ts:1146](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1146)

Fresh-limit result for one provider-qualified account.

## Properties

### provider

> **provider**: `string`

Defined in: [types/cli.ts:1148](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1148)

Provider prefix parsed from the configured account key.

---

### status

> **status**: [`AuthListRefreshStatus`](AuthListRefreshStatus.md)

Defined in: [types/cli.ts:1150](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1150)

A missing limit is explicit rather than being rendered as an unexplained dash.

---

### error?

> `optional` **error?**: `string`

Defined in: [types/cli.ts:1151](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1151)
