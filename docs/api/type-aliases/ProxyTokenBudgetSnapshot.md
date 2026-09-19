[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyTokenBudgetSnapshot

# Type Alias: ProxyTokenBudgetSnapshot

> **ProxyTokenBudgetSnapshot** = `object`

Defined in: [types/proxyBudget.ts:22](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyBudget.ts#L22)

## Properties

### scope

> **scope**: `"disabled"` \| `"process"` \| `"supervisor"`

Defined in: [types/proxyBudget.ts:23](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyBudget.ts#L23)

---

### reservationTokens

> **reservationTokens**: `number`

Defined in: [types/proxyBudget.ts:24](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyBudget.ts#L24)

---

### accountChargedTokens

> **accountChargedTokens**: `number`

Defined in: [types/proxyBudget.ts:25](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyBudget.ts#L25)

---

### accountInFlightTokens

> **accountInFlightTokens**: `number`

Defined in: [types/proxyBudget.ts:26](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyBudget.ts#L26)

---

### sessionChargedTokens

> **sessionChargedTokens**: `number`

Defined in: [types/proxyBudget.ts:27](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyBudget.ts#L27)

---

### sessionInFlightTokens

> **sessionInFlightTokens**: `number`

Defined in: [types/proxyBudget.ts:28](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyBudget.ts#L28)

---

### windowMs

> **windowMs**: `number`

Defined in: [types/proxyBudget.ts:29](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyBudget.ts#L29)

---

### estimateProvenance

> **estimateProvenance**: `string`

Defined in: [types/proxyBudget.ts:30](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyBudget.ts#L30)

---

### settlement?

> `optional` **settlement?**: `"provider_reported"` \| `"estimate_retained"` \| `"cancelled_before_dispatch"` \| `"unconfirmed"`

Defined in: [types/proxyBudget.ts:31](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyBudget.ts#L31)
