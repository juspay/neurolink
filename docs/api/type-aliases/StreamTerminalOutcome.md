[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / StreamTerminalOutcome

# Type Alias: StreamTerminalOutcome

> **StreamTerminalOutcome** = \{ `kind`: `"completed"`; \} \| \{ `kind`: `"upstream_error"`; `message`: `string`; \} \| \{ `kind`: `"client_cancelled"`; \}

Defined in: [types/proxy.ts:2333](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxy.ts#L2333)

Terminal outcome of a response body after the HTTP headers were sent.
