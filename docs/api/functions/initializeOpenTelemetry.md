[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / initializeOpenTelemetry

# Function: initializeOpenTelemetry()

> **initializeOpenTelemetry**(`config`): `Promise`\<`void`\>

Initialize OpenTelemetry once and let concurrent callers share the work.

NeuroLink constructors intentionally start this asynchronously. Keeping the
in-flight promise here lets another constructor join it and lets an immediate
flush or shutdown wait for the same initialization before touching providers.

## Parameters

### config

[`LangfuseConfig`](../type-aliases/LangfuseConfig.md)

## Returns

`Promise`\<`void`\>
