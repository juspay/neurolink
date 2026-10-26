[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DotenvBootstrapOptions

# Type Alias: DotenvBootstrapOptions

> **DotenvBootstrapOptions** = `object`

## Properties

### caller?

> `optional` **caller?**: `"cli"` \| `"sdk"`

Who is loading. The CLI prints its notices to stderr; an SDK caller
(opted in with `NEUROLINK_DOTENV=1` or by calling `loadDotenv()`) gets
the same notices through `notify`, which defaults to stderr as well.

---

### notify?

> `optional` **notify?**: (`line`) => `void`

Receives one human-readable line per notice. Default: `process.stderr`.

#### Parameters

##### line

`string`

#### Returns

`void`
