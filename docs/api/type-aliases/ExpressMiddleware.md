[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ExpressMiddleware

# Type Alias: ExpressMiddleware

> **ExpressMiddleware** = (`req`, `res`, `next`) => `Promise`\<`void`\>

Defined in: [types/auth.ts:1332](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L1332)

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
