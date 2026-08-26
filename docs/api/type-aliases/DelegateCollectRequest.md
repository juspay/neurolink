[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DelegateCollectRequest

# Type Alias: DelegateCollectRequest

> **DelegateCollectRequest** = \{ `mode`: [`DelegateCollectMode`](DelegateCollectMode.md); `waitMs?`: `number`; `sessionId?`: `string`; \} \| \{ `workerId`: `string`; `waitMs?`: `number`; `sessionId?`: `string`; \}

Defined in: [types/delegation.ts:101](https://github.com/juspay/neurolink/blob/release/src/lib/types/delegation.ts#L101)

What to collect. `waitMs` of 0 polls (return what is ready right now);
omitting it uses the runtime default.
