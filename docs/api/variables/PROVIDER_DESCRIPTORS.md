[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / PROVIDER_DESCRIPTORS

# Variable: PROVIDER_DESCRIPTORS

> `const` **PROVIDER_DESCRIPTORS**: readonly [`ProviderDescriptor`](../type-aliases/ProviderDescriptor.md)[]

Defined in: [factories/providerDescriptors.ts:39](https://github.com/juspay/neurolink/blob/release/src/lib/factories/providerDescriptors.ts#L39)

Single source of truth for provider identity, credentials, defaults, and
runtime behavior classification. Pure data — no provider-class imports,
no dynamic import(), no side effects beyond building the two derived
lookup maps below. Order follows the AIProviderName enum declaration
order (enums.ts:8-40) so this file stays easy to diff against it.
