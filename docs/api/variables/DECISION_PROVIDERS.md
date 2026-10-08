[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DECISION_PROVIDERS

# Variable: DECISION_PROVIDERS

> `const` **DECISION_PROVIDERS**: readonly [`ProviderDescriptor`](../type-aliases/ProviderDescriptor.md)[]

Providers that serve the `decide` inference type, derived from each
descriptor's `inferenceKinds` and sorted by `decideOrder`, lowest first. A
provider that declares nothing is a text provider, so it is not here.
