[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AttachmentPolicy

# Type Alias: AttachmentPolicy

> **AttachmentPolicy** = `object`

The resolved, immutable form of [AttachmentsConfig](AttachmentsConfig.md) that the loaders
consume. `allowedRoots` holds absolute paths; `undefined` means unrestricted.

## Properties

### kind

> `readonly` **kind**: `"neurolink-attachment-policy"`

---

### allowedRoots

> `readonly` **allowedRoots**: readonly `string`[] \| `undefined`

---

### allowInsecureUrls

> `readonly` **allowInsecureUrls**: `boolean`

---

### allowPrivateNetwork

> `readonly` **allowPrivateNetwork**: `boolean`

---

### followRedirects

> `readonly` **followRedirects**: `boolean`

---

### maxBytes

> `readonly` **maxBytes**: `number` \| `undefined`
