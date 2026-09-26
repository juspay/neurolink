[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / mcpLogger

# Variable: mcpLogger

> `const` **mcpLogger**: `NeuroLinkLogger` = `neuroLinkLogger`

MCP compatibility exports - all use the same unified logger instance.
These exports maintain backward compatibility with code that expects
separate loggers for different MCP components, while actually using
the same underlying logger instance.
