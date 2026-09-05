[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyWorkerControlMessage

# Type Alias: ProxyWorkerControlMessage

> **ProxyWorkerControlMessage** = \{ `type`: `"proxy-worker:activate"`; `generation`: `number`; \} \| \{ `type`: `"proxy-worker:drain"`; `generation`: `number`; \} \| \{ `type`: `"proxy-worker:shutdown"`; `generation`: `number`; \} \| \{ `type`: `"proxy-worker:socket-commit"`; `generation`: `number`; `socketId`: `string`; \} \| \{ `type`: `"proxy-worker:socket-cancel"`; `generation`: `number`; `socketId`: `string`; \}

Defined in: [types/proxy.ts:2666](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2666)
