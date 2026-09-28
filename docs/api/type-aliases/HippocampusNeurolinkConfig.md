[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / HippocampusNeurolinkConfig

# Type Alias: HippocampusNeurolinkConfig

> **HippocampusNeurolinkConfig** = `object`

Condenser settings forwarded to Hippocampus.

`provider` / `model` / `temperature` select the condensation model.
`credentials` and `instance` are read by `@juspay/hippocampus` ≥0.2.0;
the peer floor is 0.2.1, which also substitutes the condensation
placeholders literally (user content containing `$&` no longer corrupts
the prompt). NeuroLink always fills `instance` itself — a dedicated
child instance that carries this instance's `credentials` — unless the
host supplies one, so condensation stops depending on provider keys being
present in `process.env`.

## Properties

### provider?

> `optional` **provider?**: `string`

---

### model?

> `optional` **model?**: `string`

---

### temperature?

> `optional` **temperature?**: `number`

---

### credentials?

> `optional` **credentials?**: [`NeurolinkCredentials`](NeurolinkCredentials.md)

Credentials for the condenser's own NeuroLink instance. Defaults to the
parent `new NeuroLink({ credentials })` value.

---

### instance?

> `optional` **instance?**: [`HippocampusNeurolinkLike`](HippocampusNeurolinkLike.md)

Host-managed condenser. When set, NeuroLink does not build a child
instance and passes this object through untouched.
