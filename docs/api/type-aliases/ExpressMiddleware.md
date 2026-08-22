[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ExpressMiddleware

# Type Alias: ExpressMiddleware

> **ExpressMiddleware** = (`req`, `res`, `next`) => `Promise`\<`void`\>

Defined in: [types/auth.ts:1332](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/auth.ts#L1332)

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
