[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / StreamTerminalOutcome

# Type Alias: StreamTerminalOutcome

> **StreamTerminalOutcome** = \{ `kind`: `"completed"`; \} \| \{ `kind`: `"upstream_error"`; `message`: `string`; \} \| \{ `kind`: `"client_cancelled"`; \}

Defined in: [types/proxy.ts:2254](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/proxy.ts#L2254)

Terminal outcome of a response body after the HTTP headers were sent.
