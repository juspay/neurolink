[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AuthListRefreshAccountResult

# Type Alias: AuthListRefreshAccountResult

> **AuthListRefreshAccountResult** = `object`

Defined in: [types/cli.ts:1152](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1152)

Fresh-limit result for one provider-qualified account.

## Properties

### provider

> **provider**: `string`

Defined in: [types/cli.ts:1154](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1154)

Provider prefix parsed from the configured account key.

---

### status

> **status**: [`AuthListRefreshStatus`](AuthListRefreshStatus.md)

Defined in: [types/cli.ts:1156](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1156)

A missing limit is explicit rather than being rendered as an unexplained dash.

---

### error?

> `optional` **error?**: `string`

Defined in: [types/cli.ts:1157](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1157)
