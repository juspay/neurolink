[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AttachmentRefusalCode

# Type Alias: AttachmentRefusalCode

> **AttachmentRefusalCode** = `"ATTACHMENT_OUTSIDE_ROOTS"` \| `"ATTACHMENT_NOT_A_FILE"` \| `"ATTACHMENT_TOO_LARGE"` \| `"ATTACHMENT_URL_REFUSED"`

Machine-readable reasons an attachment was refused. Carried as `code` on the
thrown error so callers can map them without parsing messages.
