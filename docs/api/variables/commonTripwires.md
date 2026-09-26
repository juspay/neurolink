[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / commonTripwires

# Variable: commonTripwires

> `const` **commonTripwires**: [`TripwireConfig`](../type-aliases/TripwireConfig.md)[]

All built-in tripwires in default registration order.

Registration order does not affect priority — `evaluate()` always promotes
the highest-severity action ("abort" > "warn" > "log").
