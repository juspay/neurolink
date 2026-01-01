[**NeuroLink API Reference v8.26.1**](../README.md)

---

[NeuroLink API Reference](../globals.md) / mcpLogger

# Variable: mcpLogger

> `const` **mcpLogger**: `NeuroLinkLogger` = `neuroLinkLogger`

Defined in: [utils/logger.ts:409](https://github.com/juspay/neurolink/blob/997832c0dc437abf3a045a6ab43aafda5c330f4e/src/lib/utils/logger.ts#L409)

MCP compatibility exports - all use the same unified logger instance.
These exports maintain backward compatibility with code that expects
separate loggers for different MCP components, while actually using
the same underlying logger instance.
