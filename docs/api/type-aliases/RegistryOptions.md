[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RegistryOptions

# Type Alias: RegistryOptions

> **RegistryOptions** = `object`

Defined in: [types/processor.ts:339](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L339)

Options for registry operations.
Controls behavior when registering processors.

## Properties

### allowDuplicates?

> `optional` **allowDuplicates?**: `boolean`

Defined in: [types/processor.ts:344](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L344)

Allow registering processors with duplicate names.
If false (default), an error is thrown on duplicate names.

---

### overwriteExisting?

> `optional` **overwriteExisting?**: `boolean`

Defined in: [types/processor.ts:350](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L350)

Overwrite existing processor with the same name.
Takes precedence over allowDuplicates.
