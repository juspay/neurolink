[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AuthListRefreshAccountResult

# Type Alias: AuthListRefreshAccountResult

> **AuthListRefreshAccountResult** = `object`

Fresh-limit result for one provider-qualified account.

## Properties

### provider

> **provider**: `string`

Provider prefix parsed from the configured account key.

---

### status

> **status**: [`AuthListRefreshStatus`](AuthListRefreshStatus.md)

A missing limit is explicit rather than being rendered as an unexplained dash.

---

### error?

> `optional` **error?**: `string`
