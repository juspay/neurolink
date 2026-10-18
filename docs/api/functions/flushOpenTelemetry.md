[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / flushOpenTelemetry

# Function: flushOpenTelemetry()

> **flushOpenTelemetry**(): `Promise`\<`void`\>

## Returns

`Promise`\<`void`\>

Resolves when every owned provider has flushed.

## Description

Exports pending spans and metrics from the providers NeuroLink owns and flushes its Langfuse exporter. A host provider is never flushed. The OTLP span and metric exports are waited for at most the flush budget (`observability.langfuse.flushBudgetMs`, default 3000 ms) and the Langfuse exporter within its own budget. A provider that fails to flush, or does not finish within the budget (a collector that cannot be reached, for one), is logged as a warning and makes the call reject once every provider has settled.

## Throws

When any provider fails to flush or does not finish within the flush budget.
