[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyWorkerControlMessage

# Type Alias: ProxyWorkerControlMessage

> **ProxyWorkerControlMessage** = \{ `type`: `"proxy-worker:activate"`; `generation`: `number`; \} \| \{ `type`: `"proxy-worker:drain"`; `generation`: `number`; \} \| \{ `type`: `"proxy-worker:shutdown"`; `generation`: `number`; \} \| \{ `type`: `"proxy-worker:socket-offer"`; `generation`: `number`; `socketId`: `string`; \} \| \{ `type`: `"proxy-worker:socket-commit"`; `generation`: `number`; `socketId`: `string`; \} \| \{ `type`: `"proxy-worker:socket-cancel"`; `generation`: `number`; `socketId`: `string`; \}
