[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / FileModality

# Type Alias: FileModality

> **FileModality** = `"image"` \| `"audio"` \| `"video"` \| `"document"` \| `"data"` \| `"archive"`

Defined in: [types/file.ts:82](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/file.ts#L82)

Broad category a file format belongs to, as a human would name it.

Distinct from [FileType](FileType.md), which is the _routing_ type the detector
emits. The two deliberately differ where one processor handles several
formats: an .odt has `modality: "document"` but `fileType: "docx"`, and a
.svg has `modality: "image"` but `fileType: "svg"` because it is sanitised as
markup rather than sent to a vision API.
