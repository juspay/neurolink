[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyWorkerStatusMessage

# Type Alias: ProxyWorkerStatusMessage

> **ProxyWorkerStatusMessage** = \{ `type`: `"proxy-worker:ready"`; `generation`: `number`; `pid`: `number`; `version`: `string`; \} \| \{ `type`: `"proxy-worker:drained"`; `generation`: `number`; `pid`: `number`; \} \| \{ `type`: `"proxy-worker:activated"`; `generation`: `number`; `pid`: `number`; \} \| \{ `type`: `"proxy-worker:fatal"`; `generation`: `number`; `pid`: `number`; `message`: `string`; \} \| \{ `type`: `"proxy-worker:socket-accepted"`; `generation`: `number`; `pid`: `number`; `socketId`: `string`; \} \| \{ `type`: `"proxy-worker:replacement-requested"`; `generation`: `number`; `pid`: `number`; `reason`: `"environment"`; \}

Defined in: [types/proxy.ts:2487](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/proxy.ts#L2487)
