[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ServerBodyParserVerdict

# Type Alias: ServerBodyParserVerdict

> **ServerBodyParserVerdict** = \{ `kind`: `"skip"`; `body`: `unknown`; \} \| \{ `kind`: `"parse"`; \} \| \{ `kind`: `"reject"`; `error`: `unknown`; `beforeRead`: `boolean`; \}

What a body-parser middleware decides about a request, asked before any of
its body is read: leave it alone, parse it, or refuse it. A refusal made
before the parser would read anything has `beforeRead` set; one the parser
only reaches once it starts to read (a charset the decoder cannot handle)
has not.
