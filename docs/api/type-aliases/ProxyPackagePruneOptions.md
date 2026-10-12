[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyPackagePruneOptions

# Type Alias: ProxyPackagePruneOptions

> **ProxyPackagePruneOptions** = `object`

Retention pass over the immutable package store, with injectable process listing.

## Properties

### packagesDir

> **packagesDir**: `string`

---

### currentEntryScript?

> `optional` **currentEntryScript?**: `string`

Entry script of the calling process; its build is never removed.

---

### minAgeMs?

> `optional` **minAgeMs?**: `number`

Builds written more recently than this are left for a later pass.

---

### now?

> `optional` **now?**: `number`

---

### dryRun?

> `optional` **dryRun?**: `boolean`

Report what would be removed without touching the store.

---

### isCurrentOwner?

> `optional` **isCurrentOwner?**: () => `boolean`

Checked before each removal; the pass stops as soon as it returns false.

#### Returns

`boolean`

---

### listProcessCommandLines?

> `optional` **listProcessCommandLines?**: () => `Promise`\<`string`[] \| `null`\>

Command lines of live processes, or null when they cannot be listed.

#### Returns

`Promise`\<`string`[] \| `null`\>
