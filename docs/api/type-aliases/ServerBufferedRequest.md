[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ServerBufferedRequest

# Type Alias: ServerBufferedRequest

> **ServerBufferedRequest** = `Readable` & `object`

The request a body-parser middleware is handed in place of the real one: a
stream of bytes that were already read, with the headers the parser decides
from. `body` is where the parser leaves its result, as on a real request.

## Type Declaration

### headers

> **headers**: `IncomingHttpHeaders`

### body

> **body**: `unknown`
