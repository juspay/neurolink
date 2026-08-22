[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyCancellableTransformer

# Type Alias: ProxyCancellableTransformer\<I, O\>

> **ProxyCancellableTransformer**\<`I`, `O`\> = `Transformer`\<`I`, `O`\> & `object`

Defined in: [types/proxy.ts:2054](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxy.ts#L2054)

A stream transformer that also handles cancellation.

The Streams standard gives `Transformer` a `cancel()` callback — invoked when
the stream is aborted rather than closed cleanly — and Node implements it,
but TypeScript's bundled lib does not declare it yet. Without it there is no
way to observe a client hanging up mid-response.

## Type Declaration

### cancel?

> `optional` **cancel?**: (`reason?`) => `void`

#### Parameters

##### reason?

`unknown`

#### Returns

`void`

## Type Parameters

### I

`I`

### O

`O`
