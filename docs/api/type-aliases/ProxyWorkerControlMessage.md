[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyWorkerControlMessage

# Type Alias: ProxyWorkerControlMessage

> **ProxyWorkerControlMessage** = \{ `type`: `"proxy-worker:activate"`; `generation`: `number`; \} \| \{ `type`: `"proxy-worker:drain"`; `generation`: `number`; \} \| \{ `type`: `"proxy-worker:shutdown"`; `generation`: `number`; \} \| \{ `type`: `"proxy-worker:socket-commit"`; `generation`: `number`; `socketId`: `string`; \} \| \{ `type`: `"proxy-worker:socket-cancel"`; `generation`: `number`; `socketId`: `string`; \}

Defined in: [types/proxy.ts:2551](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxy.ts#L2551)
