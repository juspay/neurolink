# Tool Blocking Feature Example

This example demonstrates how to use the `blockedTools` feature to prevent specific tools from being executed on external MCP servers.

## Example Configuration

Create or update your `.mcp-config.json` file:

```json
{
  "mcpServers": {
    "filesystem": {
      "name": "filesystem",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "."],
      "transport": "stdio",
      "blockedTools": ["move_file", "delete_file", "remove_directory"]
    },
    "github": {
      "name": "github",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "transport": "stdio",
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "your_token_here"
      },
      "blockedTools": ["delete_repository", "transfer_repository"]
    },
    "bitbucket": {
      "name": "bitbucket",
      "command": "npx",
      "args": ["-y", "@nexus2520/bitbucket-mcp-server"],
      "transport": "stdio",
      "env": {
        "BITBUCKET_USERNAME": "your-bitbucket-username",
        "BITBUCKET_APP_PASSWORD": "your-app-password"
      },
      "blockedTools": ["delete_repository", "delete_branch"]
    }
  }
}
```

## Testing the Feature

### 1. Load the Configuration

```typescript
import { NeuroLink } from "@juspay/neurolink";

// The .mcp-config.json in the working directory is loaded automatically
// the first time MCP is used (getMCPStatus(), generate(), stream(), ...)
const neurolink = new NeuroLink();
```

### 2. List Available Tools

```typescript
// Get MCP status to see loaded servers
const status = await neurolink.getMCPStatus();
console.log(`Loaded ${status.totalServers} servers`);

// List all available tools (blocked tools won't appear here)
const tools = await neurolink.getAllAvailableTools();
console.log(
  "Available tools:",
  tools.map((t) => t.name),
);
```

### 3. Attempt to Execute a Blocked Tool

```typescript
try {
  // This will fail because 'delete_file' is blocked
  await neurolink.executeExternalMCPTool("filesystem", "delete_file", {
    path: "/some/file.txt",
  });
} catch (error) {
  console.error("Expected error:", error.message);
  // Output: "Tool 'delete_file' is blocked on server 'filesystem' by configuration"
}
```

### 4. Execute an Allowed Tool

```typescript
// This will succeed because 'read_file' is not blocked
const content = await neurolink.executeExternalMCPTool(
  "filesystem",
  "read_file",
  {
    path: "/some/file.txt",
  },
);
console.log("File content:", content);
```

## Use Cases

### 1. Production Safety

Block destructive operations in production:

```json
{
  "mcpServers": {
    "filesystem-prod": {
      "blockedTools": [
        "delete_file",
        "remove_directory",
        "move_file",
        "write_file"
      ]
    }
  }
}
```

### 2. Read-Only GitHub Access

Allow read operations but block writes:

```json
{
  "mcpServers": {
    "github-readonly": {
      "blockedTools": [
        "create_repository",
        "delete_repository",
        "create_issue",
        "close_issue",
        "create_pull_request",
        "merge_pull_request"
      ]
    }
  }
}
```

### 3. Compliance and Audit

Block sensitive operations that require audit trails:

```json
{
  "mcpServers": {
    "database": {
      "blockedTools": [
        "drop_table",
        "truncate_table",
        "delete_all_records",
        "update_schema"
      ]
    }
  }
}
```

## Verification

Run tests to verify the feature works correctly:

```bash
# Run the blocklist tests
pnpm test test/unit/mcp/externalServerBlocklist.test.ts

# Or run all tests
pnpm test
```

## Notes

- Blocked tools are filtered during discovery, so they won't appear in the list of available tools
- Attempts to execute blocked tools will throw an error with a clear message
- The blockedTools array can be empty or omitted if no tools need to be blocked
- Tool names are case-sensitive and must match exactly
