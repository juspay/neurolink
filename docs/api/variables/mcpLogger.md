[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / mcpLogger

# Variable: mcpLogger

> `const` **mcpLogger**: `NeuroLinkLogger` = `neuroLinkLogger`

Defined in: [utils/logger.ts:553](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/utils/logger.ts#L553)

MCP compatibility exports - all use the same unified logger instance.
These exports maintain backward compatibility with code that expects
separate loggers for different MCP components, while actually using
the same underlying logger instance.
