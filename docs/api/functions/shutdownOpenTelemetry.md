[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / shutdownOpenTelemetry

# Function: shutdownOpenTelemetry()

> **shutdownOpenTelemetry**(): `Promise`\<`void`\>

## Returns

`Promise`\<`void`\>

Resolves when telemetry is flushed or shut down, or the flush budget has run out.

## Description

Terminally shuts down the providers NeuroLink owns once no `acquireTelemetry` holder remains; while holders remain it only flushes, as `flushOpenTelemetry` does. Telemetry cannot be restarted in this process afterwards. A host provider is never shut down; with one, only NeuroLink's Langfuse exporter is shut down and unregistered. The OTLP exporters get the same budget as `flushOpenTelemetry`, and a failure of the shutdown itself is logged as a warning.

## Throws

When holders remain and the flush they get fails.
