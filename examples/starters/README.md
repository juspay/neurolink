# Starters

Self-contained templates you can copy out and run in under a minute. Each has its own
`package.json` — no monorepo setup needed:

```bash
npx degit juspay/neurolink/examples/starters/<name> my-app
cd my-app && npm install
```

| Starter          | Shows                                                                    |
| ---------------- | ------------------------------------------------------------------------ |
| `chat`           | Streaming terminal chat with automatic provider selection                |
| `mcp-client`     | Registering an MCP server (filesystem) and letting the model use it      |
| `proxy-failover` | Running the Claude Code proxy with account pooling + a status health CLI |

Each starter's README lists the exact env vars it needs.
