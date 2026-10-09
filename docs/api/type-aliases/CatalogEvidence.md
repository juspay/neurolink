[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CatalogEvidence

# Type Alias: CatalogEvidence

> **CatalogEvidence** = `object`

## Properties

### rosterVerified

> **rosterVerified**: [`CatalogProbeEvidence`](CatalogProbeEvidence.md)

Historical dated evidence. Its presence does not reverify an account
roster or live execution; the authoring admission command reports those
states separately without changing existing catalog records.

---

### authProbe?

> `optional` **authProbe?**: [`CatalogProbeEvidence`](CatalogProbeEvidence.md)

---

### billingProbe?

> `optional` **billingProbe?**: [`CatalogProbeEvidence`](CatalogProbeEvidence.md)

---

### liveMatrix

> **liveMatrix**: \{ `date`: `string`; `result`: `string`; \} \| `null`

---

### addedInPR

> **addedInPR**: `string`

Introduction PR identity, or PENDING_PR during local source authoring.
A string/URL alone is not proof of PR association, merge or release.
