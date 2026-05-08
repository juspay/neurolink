[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / HITLStatistics

# Type Alias: HITLStatistics

> **HITLStatistics** = `object`

Defined in: [types/hitl.ts:243](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/hitl.ts#L243)

HITL statistics interface
Provides metrics about HITL usage for monitoring

## Properties

### totalRequests

> **totalRequests**: `number`

Defined in: [types/hitl.ts:245](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/hitl.ts#L245)

Total number of confirmation requests made

---

### pendingRequests

> **pendingRequests**: `number`

Defined in: [types/hitl.ts:248](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/hitl.ts#L248)

Number of pending confirmations

---

### averageResponseTime

> **averageResponseTime**: `number`

Defined in: [types/hitl.ts:251](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/hitl.ts#L251)

Average response time for user decisions

---

### approvedRequests

> **approvedRequests**: `number`

Defined in: [types/hitl.ts:254](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/hitl.ts#L254)

Number of approved requests

---

### rejectedRequests

> **rejectedRequests**: `number`

Defined in: [types/hitl.ts:257](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/hitl.ts#L257)

Number of rejected requests

---

### timedOutRequests

> **timedOutRequests**: `number`

Defined in: [types/hitl.ts:260](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/hitl.ts#L260)

Number of timed out requests
