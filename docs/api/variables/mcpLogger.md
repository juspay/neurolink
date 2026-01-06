[**NeuroLink API Reference v8.32.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / mcpLogger

# Variable: mcpLogger

> `const` **mcpLogger**: `NeuroLinkLogger` = `neuroLinkLogger`

Defined in: [utils/logger.ts:409](https://github.com/juspay/neurolink/blob/e2ee0ff27847312a233f21617e325b3d2c69c76c/src/lib/utils/logger.ts#L409)

MCP compatibility exports - all use the same unified logger instance.
These exports maintain backward compatibility with code that expects
separate loggers for different MCP components, while actually using
the same underlying logger instance.
