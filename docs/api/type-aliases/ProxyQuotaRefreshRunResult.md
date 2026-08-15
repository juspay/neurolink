[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyQuotaRefreshRunResult

# Type Alias: ProxyQuotaRefreshRunResult

> **ProxyQuotaRefreshRunResult** = \{ `kind`: `"completed"`; `result`: [`AccountUsageFetchResult`](AccountUsageFetchResult.md); `startedAt`: `number`; \} \| \{ `kind`: `"backoff"`; `nextEligibleAt`: `number`; \} \| \{ `kind`: `"not_due"`; \}

Defined in: [types/proxy.ts:1330](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/proxy.ts#L1330)

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
