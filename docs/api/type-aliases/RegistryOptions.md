[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RegistryOptions

# Type Alias: RegistryOptions

> **RegistryOptions** = `object`

Options for registry operations.
Controls behavior when registering processors.

## Properties

### allowDuplicates?

> `optional` **allowDuplicates?**: `boolean`

Allow registering processors with duplicate names.
If false (default), an error is thrown on duplicate names.

---

### overwriteExisting?

> `optional` **overwriteExisting?**: `boolean`

Overwrite existing processor with the same name.
Takes precedence over allowDuplicates.
