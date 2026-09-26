[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DelegateCollectRequest

# Type Alias: DelegateCollectRequest

> **DelegateCollectRequest** = \{ `mode`: [`DelegateCollectMode`](DelegateCollectMode.md); `waitMs?`: `number`; `sessionId?`: `string`; \} \| \{ `workerId`: `string`; `waitMs?`: `number`; `sessionId?`: `string`; \}

What to collect. `waitMs` of 0 polls (return what is ready right now);
omitting it uses the runtime default.
