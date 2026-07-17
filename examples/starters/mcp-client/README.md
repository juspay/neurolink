# mcp-client

Shows NeuroLink wiring up an external MCP (Model Context Protocol) server —
the reference `@modelcontextprotocol/server-filesystem` — and letting the
model call it during a single `generate()` to read a local file.

## Quickstart

```bash
npx degit juspay/neurolink/examples/starters/mcp-client my-app
cd my-app && npm install
cp .env.example .env   # then edit .env and set one provider key
npm start
```

## How the MCP server gets registered

NeuroLink auto-loads `.mcp-config.json` from the current working directory
during MCP initialization (see `src/lib/mcp/externalServerManager.ts`,
`loadMCPConfiguration`, default path `.mcp-config.json` in `cwd`). This
starter ships one that spawns the filesystem server scoped to `.` (this
directory), so it can only read files here — including `sample.txt`.

```json
{
  "mcpServers": {
    "filesystem": {
      "name": "filesystem",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "."],
      "transport": "stdio"
    }
  }
}
```

The NeuroLink CLI's `mcp add` / `mcp install` commands write to the same
file and shape. Adding this server by hand would look like:

```bash
neurolink mcp add filesystem npx --args "-y,@modelcontextprotocol/server-filesystem,." --transport stdio
# or, for the popular-servers shortcut:
neurolink mcp install filesystem
```

`src/index.ts` calls `neurolink.getMCPStatus()` and `neurolink.listMCPServers()`
to confirm the server connected, then runs one `generate()` call asking the
model to read `sample.txt` — tool use is enabled by default, so no extra flag
is needed. The printed `toolsUsed` list confirms whether the filesystem tool
actually ran.

## Requirements

- Node.js >= 20.18.1
- `npx` available (used to launch `@modelcontextprotocol/server-filesystem`
  on demand — nothing is installed globally)
- One provider API key (OpenAI, Anthropic, or Google AI Studio) in `.env`
