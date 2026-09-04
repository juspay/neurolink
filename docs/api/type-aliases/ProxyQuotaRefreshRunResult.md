[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyQuotaRefreshRunResult

# Type Alias: ProxyQuotaRefreshRunResult

> **ProxyQuotaRefreshRunResult** = \{ `kind`: `"completed"`; `result`: [`AccountUsageFetchResult`](AccountUsageFetchResult.md); `startedAt`: `number`; \} \| \{ `kind`: `"backoff"`; `nextEligibleAt`: `number`; \} \| \{ `kind`: `"not_due"`; \}

Defined in: [types/proxy.ts:1430](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1430)

## Union Members

### Type Literal

\{ `kind`: `"completed"`; `result`: [`AccountUsageFetchResult`](AccountUsageFetchResult.md); `startedAt`: `number`; \}

#### kind

> **kind**: `"completed"`

#### result

> **result**: [`AccountUsageFetchResult`](AccountUsageFetchResult.md)

#### startedAt

> **startedAt**: `number`

Lower bound for the freshness of the returned usage snapshot.

---

### Type Literal

\{ `kind`: `"backoff"`; `nextEligibleAt`: `number`; \}

---

### Type Literal

\{ `kind`: `"not_due"`; \}
