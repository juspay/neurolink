[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / StreamTerminalOutcome

# Type Alias: StreamTerminalOutcome

> **StreamTerminalOutcome** = \{ `kind`: `"completed"`; \} \| \{ `kind`: `"upstream_error"`; `message`: `string`; \} \| \{ `kind`: `"client_cancelled"`; \}

Defined in: [types/proxy.ts:2441](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2441)

Terminal outcome of a response body after the HTTP headers were sent.
