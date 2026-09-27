[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / shutdownOpenTelemetry

# Function: shutdownOpenTelemetry()

> **shutdownOpenTelemetry**(): `Promise`\<`void`\>

Shutdown OpenTelemetry and Langfuse span processor

Concurrent callers share one in-flight teardown, the same way concurrent
initializers share one in-flight `initializeOpenTelemetry`: a second
shutdown call joins the first instead of tearing down the same provider
instances a second time.

## Returns

`Promise`\<`void`\>
