[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyWorkerControlMessage

# Type Alias: ProxyWorkerControlMessage

> **ProxyWorkerControlMessage** = \{ `type`: `"proxy-worker:activate"`; `generation`: `number`; \} \| \{ `type`: `"proxy-worker:drain"`; `generation`: `number`; \} \| \{ `type`: `"proxy-worker:shutdown"`; `generation`: `number`; \} \| \{ `type`: `"proxy-worker:socket-commit"`; `generation`: `number`; `socketId`: `string`; \} \| \{ `type`: `"proxy-worker:socket-cancel"`; `generation`: `number`; `socketId`: `string`; \}

Defined in: [types/proxy.ts:2472](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/proxy.ts#L2472)
