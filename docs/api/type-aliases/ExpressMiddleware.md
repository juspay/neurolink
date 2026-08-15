[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ExpressMiddleware

# Type Alias: ExpressMiddleware

> **ExpressMiddleware** = (`req`, `res`, `next`) => `Promise`\<`void`\>

Defined in: [types/auth.ts:1332](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/auth.ts#L1332)

Express-style auth middleware signature.

## Parameters

### req

[`IncomingRequest`](IncomingRequest.md)

### res

[`OutgoingResponse`](OutgoingResponse.md)

### next

[`NextFunction`](NextFunction.md)

## Returns

`Promise`\<`void`\>
