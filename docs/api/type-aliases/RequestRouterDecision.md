[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / RequestRouterDecision

# Type Alias: RequestRouterDecision

> **RequestRouterDecision** = `object`

Defined in: [types/requestRouter.ts:37](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/requestRouter.ts#L37)

The router's decision. Any field that is undefined means "keep whatever the
caller already configured" — returning `{}` is a valid no-op.

## Properties

### provider?

> `optional` **provider?**: `string`

Defined in: [types/requestRouter.ts:38](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/requestRouter.ts#L38)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/requestRouter.ts:39](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/requestRouter.ts#L39)

---

### region?

> `optional` **region?**: `string`

Defined in: [types/requestRouter.ts:40](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/requestRouter.ts#L40)

---

### reason?

> `optional` **reason?**: `string`

Defined in: [types/requestRouter.ts:42](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/requestRouter.ts#L42)

Optional human-readable reason, emitted at debug log level.
