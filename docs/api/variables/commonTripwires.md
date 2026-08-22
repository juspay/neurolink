[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / commonTripwires

# Variable: commonTripwires

> `const` **commonTripwires**: [`TripwireConfig`](../type-aliases/TripwireConfig.md)[]

Defined in: [utils/tripwireEvaluator.ts:312](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/utils/tripwireEvaluator.ts#L312)

All built-in tripwires in default registration order.

Registration order does not affect priority — `evaluate()` always promotes
the highest-severity action ("abort" > "warn" > "log").
