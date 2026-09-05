[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AuthListRefreshAccountResult

# Type Alias: AuthListRefreshAccountResult

> **AuthListRefreshAccountResult** = `object`

Defined in: [types/cli.ts:1126](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1126)

Fresh-limit result for one provider-qualified account.

## Properties

### provider

> **provider**: `string`

Defined in: [types/cli.ts:1128](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1128)

Provider prefix parsed from the configured account key.

---

### status

> **status**: [`AuthListRefreshStatus`](AuthListRefreshStatus.md)

Defined in: [types/cli.ts:1130](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1130)

A missing limit is explicit rather than being rendered as an unexplained dash.

---

### error?

> `optional` **error?**: `string`

Defined in: [types/cli.ts:1131](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1131)
