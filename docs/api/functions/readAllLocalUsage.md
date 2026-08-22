[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / readAllLocalUsage

# Function: readAllLocalUsage()

> **readAllLocalUsage**(`options?`): `Promise`\<[`LocalUsageAggregateReport`](../type-aliases/LocalUsageAggregateReport.md)\>

Defined in: [localUsage/index.ts:35](https://github.com/juspay/neurolink/blob/release/src/lib/localUsage/index.ts#L35)

Scan every registered reader whose CLI is actually present on this machine.

"Not installed" and "failed" are reported separately and deliberately: a CLI
the user never installed is not an error, and collapsing the two would make
a broken reader indistinguishable from an absent one.

## Parameters

### options?

[`LocalUsageScanOptions`](../type-aliases/LocalUsageScanOptions.md)

## Returns

`Promise`\<[`LocalUsageAggregateReport`](../type-aliases/LocalUsageAggregateReport.md)\>
