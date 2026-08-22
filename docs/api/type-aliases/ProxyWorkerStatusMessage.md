[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyWorkerStatusMessage

# Type Alias: ProxyWorkerStatusMessage

> **ProxyWorkerStatusMessage** = \{ `type`: `"proxy-worker:ready"`; `generation`: `number`; `pid`: `number`; `version`: `string`; \} \| \{ `type`: `"proxy-worker:drained"`; `generation`: `number`; `pid`: `number`; \} \| \{ `type`: `"proxy-worker:activated"`; `generation`: `number`; `pid`: `number`; \} \| \{ `type`: `"proxy-worker:fatal"`; `generation`: `number`; `pid`: `number`; `message`: `string`; \} \| \{ `type`: `"proxy-worker:socket-accepted"`; `generation`: `number`; `pid`: `number`; `socketId`: `string`; \} \| \{ `type`: `"proxy-worker:replacement-requested"`; `generation`: `number`; `pid`: `number`; `reason`: `"environment"`; \}

Defined in: [types/proxy.ts:2566](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxy.ts#L2566)
