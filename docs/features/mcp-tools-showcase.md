---
title: MCP Tools Ecosystem - 58+ Integrations
description: Complete showcase of Model Context Protocol tools - built-in core tools and external MCP server ecosystem
keywords: mcp, model context protocol, tools, integrations, ecosystem, servers
---

# MCP Tools Ecosystem: 58+ Integrations

> **Since**: v7.0.0 | **Status**: Production Ready | **MCP Version**: 2024-11-05

## Overview

NeuroLink's Model Context Protocol (MCP) integration provides a **universal plugin system** that transforms the SDK from a simple AI interface into a complete AI development platform. With 6 built-in core tools and access to 58+ community MCP servers, you can extend AI capabilities to interact with filesystems, databases, APIs, cloud services, and custom enterprise systems.

### What is MCP?

The Model Context Protocol is an **open standard** (like USB-C for AI) that enables AI models to securely interact with external tools and data sources through a unified interface. Think of it as:

- **For Developers**: A standardized way to connect AI to any external system
- **For AI Models**: A tool registry with discoverable, executable functions
- **For Enterprises**: A controlled, auditable way to extend AI capabilities

### Why MCP Matters

| Traditional Approach                    | MCP Approach                   | Benefit                 |
| --------------------------------------- | ------------------------------ | ----------------------- |
| Custom tool integrations per provider   | One MCP tool works everywhere  | 10x faster integration  |
| Manual tool discovery and configuration | Automatic tool registry        | Zero-config tool usage  |
| Provider-specific tool formats          | Universal JSON-RPC protocol    | Provider portability    |
| Limited to SDK-defined tools            | 58+ community servers + custom | Unlimited extensibility |
| Static tool set                         | Dynamic runtime addition       | Adapt to changing needs |

### NeuroLink's Deep MCP Integration

**Factory-First Architecture**: MCP tools work internally while users see simple factory methods:

```typescript
// Same simple interface
const result = await neurolink.generate({
  input: { text: "List files and create a summary document" },
});

// But internally powered by:
// ✅ Context tracking across tool chains
// ✅ Permission-based security
// ✅ Tool registry and discovery
// ✅ Pipeline execution with error recovery
// ✅ Rich analytics and monitoring
```

**Key Features:**

- **99% Lighthouse Compatible**: Existing MCP tools work with minimal changes
- **Dynamic Server Management**: Add/remove MCP servers programmatically
- **Rich Context**: 15+ fields including session, user, permissions, metadata
- **Performance Optimized**: 0-11ms tool execution (target: <100ms)
- **Enterprise Grade**: Comprehensive error handling, audit logging, security

---

## Built-in Core Tools (6)

NeuroLink ships with 6 essential tools that require zero configuration:

### 1. getCurrentTime

**Purpose**: Real-time clock with timezone support

**Auto-Available**: Yes (always enabled)

**Use Cases**:

- Timestamp generation
- Timezone conversions
- Scheduling and reminders
- Time-based calculations

**Example**:

```typescript
const result = await neurolink.generate({
  input: { text: "What time is it in Tokyo?" },
});
// AI uses getCurrentTime tool automatically
```

**Tool Schema**:

```typescript
{
  name: "getCurrentTime",
  description: "Get current time in specified timezone",
  parameters: {
    timezone: {
      type: "string",
      description: "IANA timezone (e.g., 'America/New_York', 'Asia/Tokyo')",
      optional: true
    }
  }
}
```

### 2. readFile

**Purpose**: Read file contents from filesystem

**Auto-Available**: Yes (with filesystem access)

**Use Cases**:

- Document analysis
- Code review
- Configuration reading
- Log file processing

**Example**:

```typescript
const result = await neurolink.generate({
  input: { text: "Summarize the README.md file" },
});
// AI reads and summarizes automatically
```

**Tool Schema**:

```typescript
{
  name: "readFile",
  description: "Read contents of a file",
  parameters: {
    path: {
      type: "string",
      description: "Absolute or relative file path",
      required: true
    },
    encoding: {
      type: "string",
      description: "File encoding (default: utf-8)",
      optional: true
    }
  }
}
```

### 3. writeFile

**Purpose**: Write content to filesystem

**Auto-Available**: Yes (with HITL approval recommended)

**Use Cases**:

- Generated content saving
- Report creation
- Configuration updates
- Code generation output

**Example**:

```typescript
const result = await neurolink.generate({
  input: { text: "Generate a README and save it to README.md" },
  hitl: {
    enabled: true,
    requireApproval: ["writeFile"],
  },
});
// AI generates content and requests approval to save
```

**Tool Schema**:

```typescript
{
  name: "writeFile",
  description: "Write content to a file",
  parameters: {
    path: {
      type: "string",
      description: "File path to write",
      required: true
    },
    content: {
      type: "string",
      description: "Content to write",
      required: true
    },
    overwrite: {
      type: "boolean",
      description: "Overwrite if exists (default: false)",
      optional: true
    }
  }
}
```

### 4. listDirectory

**Purpose**: List files and directories

**Auto-Available**: Yes (with filesystem access)

**Use Cases**:

- Project structure analysis
- File discovery
- Directory traversal
- Asset inventory

**Example**:

```typescript
const result = await neurolink.generate({
  input: { text: "What TypeScript files are in the src directory?" },
});
// AI lists directory and filters for .ts files
```

**Tool Schema**:

```typescript
{
  name: "listDirectory",
  description: "List contents of a directory",
  parameters: {
    path: {
      type: "string",
      description: "Directory path",
      required: true
    },
    recursive: {
      type: "boolean",
      description: "Recursive listing (default: false)",
      optional: true
    },
    filter: {
      type: "string",
      description: "File extension filter (e.g., '.ts')",
      optional: true
    }
  }
}
```

### 5. calculateMath

**Purpose**: Complex mathematical calculations

**Auto-Available**: Yes (always enabled)

**Use Cases**:

- Financial calculations
- Statistical analysis
- Unit conversions
- Scientific computations

**Example**:

```typescript
const result = await neurolink.generate({
  input: { text: "Calculate compound interest: $10,000 at 5% for 10 years" },
});
// AI uses calculateMath for precise calculation
```

**Tool Schema**:

```typescript
{
  name: "calculateMath",
  description: "Evaluate mathematical expressions",
  parameters: {
    expression: {
      type: "string",
      description: "Mathematical expression to evaluate",
      required: true
    },
    precision: {
      type: "number",
      description: "Decimal precision (default: 2)",
      optional: true
    }
  }
}
```

### 6. websearchGrounding

**Purpose**: Web search with result grounding

**Auto-Available**: Only with Google Vertex AI provider

**Use Cases**:

- Real-time information lookup
- Fact verification
- Current events
- Research augmentation

**Example**:

```typescript
const result = await neurolink.generate({
  input: { text: "What are the latest developments in quantum computing?" },
  provider: "google-vertex", // Required for web search
});
// AI searches web and grounds response in search results
```

**Tool Schema**:

```typescript
{
  name: "websearchGrounding",
  description: "Search the web and ground responses in results",
  parameters: {
    query: {
      type: "string",
      description: "Search query",
      required: true
    },
    maxResults: {
      type: "number",
      description: "Maximum results to return (default: 5)",
      optional: true
    }
  }
}
```

**Note**: This tool is provider-specific (Google Vertex AI only) and leverages Google's grounding capabilities.

---

## External MCP Servers (58+)

NeuroLink integrates with the growing MCP ecosystem of 58+ external servers across 6 major categories.

### Quick Integration Example

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

// Add external MCP servers dynamically
await neurolink.addMCPServer("github", {
  command: "npx",
  args: ["-y", "@modelcontextprotocol/server-github"],
  env: {
    GITHUB_PERSONAL_ACCESS_TOKEN: process.env.GITHUB_TOKEN,
  },
});

await neurolink.addMCPServer("postgres", {
  command: "npx",
  args: ["-y", "@modelcontextprotocol/server-postgres"],
  env: {
    POSTGRES_CONNECTION_STRING: process.env.DATABASE_URL,
  },
});

// Now AI can use GitHub and PostgreSQL tools
const result = await neurolink.generate({
  input: {
    text: "Query the users table and create a GitHub issue summarizing active users",
  },
});
```

---

## Productivity Tools (8 Servers)

**Enterprise collaboration and workflow automation**

### GitHub - Complete Repository Management

**Install**: `npx @modelcontextprotocol/server-github`

**Tools** (15):

- `create_issue` - Create GitHub issues
- `create_pull_request` - Create PRs with diff
- `list_repos` - List repositories
- `search_code` - Search code across repos
- `get_file_contents` - Read file from repo
- `create_branch` - Create new branch
- `list_commits` - View commit history
- `get_issue` - Get issue details
- `update_issue` - Update issue status
- `comment_on_issue` - Add comments
- `list_pull_requests` - List PRs
- `merge_pull_request` - Merge PR
- `create_repository` - Create new repo
- `fork_repository` - Fork repo
- `star_repository` - Star repo

**Use Cases**:

- Automated code reviews
- Issue management from AI chat
- Repository analysis
- CI/CD integration
- Team collaboration

**Example**:

```typescript
await neurolink.addMCPServer("github", {
  command: "npx",
  args: ["-y", "@modelcontextprotocol/server-github"],
  env: {
    GITHUB_PERSONAL_ACCESS_TOKEN: process.env.GITHUB_TOKEN,
  },
});

const result = await neurolink.generate({
  input: {
    text: "Create an issue in my repo 'neurolink-examples' titled 'Add HITL example'",
  },
});
// AI creates issue automatically
```

### Google Drive - Document Management

**Install**: `npx @modelcontextprotocol/server-google-drive`

**Tools** (12):

- `list_files` - List files and folders
- `search_files` - Search by name/content
- `read_file` - Read document contents
- `create_file` - Create new file
- `update_file` - Update existing file
- `delete_file` - Delete file
- `share_file` - Manage sharing
- `create_folder` - Create folder
- `move_file` - Move file to folder
- `copy_file` - Duplicate file
- `export_file` - Export to different format
- `get_permissions` - View file permissions

**Use Cases**:

- Document processing automation
- Report generation
- Team collaboration
- Content migration

### Slack - Team Communication

**Install**: `npx @modelcontextprotocol/server-slack`

**Tools** (10):

- `send_message` - Send message to channel
- `create_channel` - Create new channel
- `list_channels` - List workspace channels
- `search_messages` - Search message history
- `get_channel_history` - Get recent messages
- `upload_file` - Upload file to channel
- `add_reaction` - Add emoji reaction
- `set_status` - Update user status
- `list_users` - List workspace members
- `get_user_info` - Get user details

**Use Cases**:

- AI notifications
- Team updates
- Automated reporting
- Incident management

### Google Calendar - Schedule Management

**Install**: `npm -g @modelcontextprotocol/server-google-calendar`

**Tools** (8):

- `list_events` - List calendar events
- `create_event` - Create new event
- `update_event` - Update event details
- `delete_event` - Delete event
- `search_events` - Search by criteria
- `get_availability` - Check free/busy
- `add_attendees` - Invite people
- `send_invites` - Send calendar invites

**Use Cases**:

- Meeting scheduling
- Availability checking
- Event reminders
- Calendar analysis

### Notion - Knowledge Management

**Install**: `npm -g @modelcontextprotocol/server-notion`

**Tools** (9):

- `create_page` - Create new page
- `update_page` - Update page content
- `search_pages` - Search workspace
- `get_page` - Get page details
- `create_database` - Create database
- `query_database` - Query database rows
- `create_row` - Add database row
- `update_row` - Update database row
- `delete_row` - Delete database row

### Jira - Issue Tracking

**Install**: `npm -g @modelcontextprotocol/server-jira`

**Tools** (11):

- `create_issue` - Create Jira issue
- `update_issue` - Update issue
- `search_issues` - JQL search
- `get_issue` - Get issue details
- `add_comment` - Comment on issue
- `transition_issue` - Change status
- `assign_issue` - Assign to user
- `create_sprint` - Create sprint
- `list_projects` - List projects
- `get_project` - Get project details
- `create_board` - Create board

### Linear - Project Management

**Install**: `npm -g @modelcontextprotocol/server-linear`

**Tools** (10):

- `create_issue` - Create issue
- `update_issue` - Update issue
- `search_issues` - Search issues
- `create_project` - Create project
- `list_projects` - List projects
- `create_milestone` - Create milestone
- `assign_issue` - Assign issue
- `add_label` - Add label
- `create_comment` - Add comment
- `get_team` - Get team info

### Trello - Board Management

**Install**: `npm -g @modelcontextprotocol/server-trello`

**Tools** (12):

- `create_card` - Create card
- `update_card` - Update card
- `move_card` - Move to list
- `create_board` - Create board
- `create_list` - Create list
- `add_member` - Add member to card
- `add_label` - Add label
- `add_comment` - Add comment
- `create_checklist` - Add checklist
- `attach_file` - Attach file
- `archive_card` - Archive card
- `get_board` - Get board details

---

## Database Tools (5 Servers)

**Direct database access for AI-powered data operations**

### PostgreSQL - Relational Database

**Install**: `npx @modelcontextprotocol/server-postgres`

**Tools** (8):

- `query` - Execute SELECT queries
- `insert` - Insert rows
- `update` - Update rows
- `delete` - Delete rows
- `list_tables` - List all tables
- `describe_table` - Get table schema
- `create_table` - Create new table
- `execute` - Execute arbitrary SQL

**Configuration**:

```typescript
await neurolink.addMCPServer("postgres", {
  command: "npx",
  args: ["-y", "@modelcontextprotocol/server-postgres"],
  env: {
    POSTGRES_CONNECTION_STRING: "postgresql://user:pass@localhost:5432/mydb",
  },
});
```

**Use Cases**:

- Natural language database queries
- Data analysis and reporting
- Database management
- Schema exploration

### SQLite - Embedded Database

**Install**: `npx @modelcontextprotocol/server-sqlite`

**Tools** (7):

- `query` - Execute queries
- `execute` - Run SQL statements
- `list_tables` - List tables
- `get_schema` - Get database schema
- `insert` - Insert data
- `update` - Update data
- `delete` - Delete data

### MongoDB - Document Database

**Install**: `npm -g @modelcontextprotocol/server-mongodb`

**Tools** (9):

- `find` - Find documents
- `insert` - Insert documents
- `update` - Update documents
- `delete` - Delete documents
- `aggregate` - Run aggregation pipeline
- `create_collection` - Create collection
- `list_collections` - List collections
- `create_index` - Create index
- `drop_collection` - Drop collection

### Redis - Key-Value Store

**Install**: `npm -g @modelcontextprotocol/server-redis`

**Tools** (10):

- `get` - Get value by key
- `set` - Set key-value pair
- `del` - Delete key
- `keys` - List keys by pattern
- `incr` - Increment counter
- `decr` - Decrement counter
- `lpush` - Push to list
- `rpush` - Push to list
- `lrange` - Get list range
- `hgetall` - Get hash

### MySQL/MariaDB - Relational Database

**Install**: `npx @modelcontextprotocol/server-mysql`

**Tools** (8):

- `query` - Execute queries
- `insert` - Insert rows
- `update` - Update rows
- `delete` - Delete rows
- `show_tables` - List tables
- `describe` - Get table structure
- `execute` - Run SQL
- `transaction` - Execute transaction

---

## Development Tools (15 Servers)

**Version control, containers, cloud infrastructure**

### Git - Local Repository Operations

**Install**: `npx @modelcontextprotocol/server-git`

**Tools** (12):

- `status` - Get repo status
- `diff` - Show diff
- `log` - View commit history
- `commit` - Create commit
- `push` - Push to remote
- `pull` - Pull from remote
- `branch` - Manage branches
- `checkout` - Switch branches
- `merge` - Merge branches
- `stash` - Stash changes
- `tag` - Manage tags
- `clone` - Clone repository

### Docker - Container Management

**Install**: `npm -g @modelcontextprotocol/server-docker`

**Tools** (14):

- `ps` - List containers
- `run` - Run container
- `stop` - Stop container
- `start` - Start container
- `restart` - Restart container
- `logs` - View logs
- `exec` - Execute command
- `build` - Build image
- `pull` - Pull image
- `push` - Push image
- `images` - List images
- `rm` - Remove container
- `rmi` - Remove image
- `inspect` - Inspect container

### Kubernetes - Cluster Management

**Install**: `npm -g @modelcontextprotocol/server-kubernetes`

**Tools** (15):

- `get_pods` - List pods
- `describe_pod` - Pod details
- `logs` - Get pod logs
- `exec` - Execute in pod
- `create` - Create resource
- `apply` - Apply manifest
- `delete` - Delete resource
- `scale` - Scale deployment
- `rollout` - Manage rollout
- `get_services` - List services
- `get_deployments` - List deployments
- `get_nodes` - List nodes
- `port_forward` - Port forward
- `get_configmaps` - List configmaps
- `get_secrets` - List secrets

### GitLab - Repository Platform

**Install**: `npm -g @modelcontextprotocol/server-gitlab`

**Tools** (13):

- `create_issue` - Create issue
- `create_merge_request` - Create MR
- `list_projects` - List projects
- `get_project` - Get project
- `list_pipelines` - List CI/CD
- `get_pipeline` - Get pipeline
- `create_branch` - Create branch
- `list_commits` - List commits
- `get_file` - Get file
- `create_file` - Create file
- `update_file` - Update file
- `delete_file` - Delete file
- `search_code` - Search code

### NPM - Package Manager

**Install**: `npx @modelcontextprotocol/server-npm`

**Tools** (6):

- `search` - Search packages
- `info` - Get package info
- `install` - Install package
- `outdated` - Check outdated
- `update` - Update packages
- `list` - List installed

### Terraform - Infrastructure as Code

**Install**: `npm -g @modelcontextprotocol/server-terraform`

**Tools** (8):

- `plan` - Generate plan
- `apply` - Apply changes
- `destroy` - Destroy resources
- `show` - Show state
- `output` - Get outputs
- `validate` - Validate config
- `fmt` - Format files
- `workspace` - Manage workspaces

### AWS - Amazon Web Services

**Install**: `npm -g @modelcontextprotocol/server-aws`

**Tools** (20+):

- EC2: `list_instances`, `start_instance`, `stop_instance`
- S3: `list_buckets`, `get_object`, `put_object`
- Lambda: `invoke_function`, `list_functions`
- RDS: `list_databases`, `create_snapshot`
- CloudWatch: `get_metrics`, `put_metric`
- And many more...

### GCP - Google Cloud Platform

**Install**: `npm -g @modelcontextprotocol/server-gcp`

**Tools** (18+):

- Compute: `list_instances`, `create_instance`
- Storage: `list_buckets`, `upload_object`
- BigQuery: `query`, `list_datasets`
- Pub/Sub: `publish`, `create_topic`
- Functions: `deploy`, `invoke`

### Azure - Microsoft Cloud

**Install**: `npm -g @modelcontextprotocol/server-azure`

**Tools** (15+):

- VMs: `list_vms`, `start_vm`, `stop_vm`
- Blob Storage: `list_containers`, `upload_blob`
- Functions: `list_functions`, `invoke`
- SQL: `list_databases`, `query`
- Cosmos DB: `query`, `insert`

---

## Web & APIs (10 Servers)

**Web scraping, search, and HTTP operations**

### Puppeteer - Browser Automation

**Install**: `npx @modelcontextprotocol/server-puppeteer`

**Tools** (11):

- `navigate` - Navigate to URL
- `screenshot` - Take screenshot
- `click` - Click element
- `type` - Type text
- `wait` - Wait for element
- `extract` - Extract content
- `pdf` - Generate PDF
- `cookies` - Manage cookies
- `evaluate` - Run JavaScript
- `scroll` - Scroll page
- `select` - Select dropdown

**Use Cases**:

- Web scraping
- Automated testing
- Screenshot generation
- Form filling

### Brave Search - Web Search

**Install**: `npm -g @modelcontextprotocol/server-brave-search`

**Tools** (3):

- `search` - Web search
- `news_search` - News search
- `image_search` - Image search

### Google Custom Search

**Install**: `npm -g @modelcontextprotocol/server-google-search`

**Tools** (4):

- `search` - Web search
- `image_search` - Image search
- `video_search` - Video search
- `news_search` - News search

### Exa - Semantic Search

**Install**: `npm -g @modelcontextprotocol/server-exa`

**Tools** (5):

- `search` - AI-powered search
- `similar` - Find similar content
- `contents` - Get page contents
- `highlights` - Extract highlights
- `find_company` - Company lookup

### HTTP Fetch - REST API Client

**Install**: `npx @modelcontextprotocol/server-fetch`

**Tools** (5):

- `get` - HTTP GET
- `post` - HTTP POST
- `put` - HTTP PUT
- `delete` - HTTP DELETE
- `patch` - HTTP PATCH

### GraphQL Client

**Install**: `npm -g @modelcontextprotocol/server-graphql`

**Tools** (3):

- `query` - Execute query
- `mutation` - Execute mutation
- `introspect` - Get schema

### Weather API

**Install**: `npm -g @modelcontextprotocol/server-weather`

**Tools** (4):

- `current` - Current weather
- `forecast` - Weather forecast
- `historical` - Historical data
- `alerts` - Weather alerts

### RSS Feed Reader

**Install**: `npm -g @modelcontextprotocol/server-rss`

**Tools** (4):

- `list_feeds` - List subscribed feeds
- `fetch_feed` - Fetch feed items
- `search` - Search across feeds
- `add_feed` - Subscribe to feed

---

## Search & Knowledge (6 Servers)

### Wikipedia - Encyclopedia

**Install**: `npm -g @modelcontextprotocol/server-wikipedia`

**Tools** (5):

- `search` - Search articles
- `get_article` - Get full article
- `summary` - Get summary
- `random` - Random article
- `nearby` - Nearby locations

### Wolfram Alpha - Computational Knowledge

**Install**: `npm -g @modelcontextprotocol/server-wolfram`

**Tools** (4):

- `query` - Computational query
- `simple` - Simple answer
- `full` - Full results
- `image` - Result as image

### arXiv - Research Papers

**Install**: `npm -g @modelcontextprotocol/server-arxiv`

**Tools** (4):

- `search` - Search papers
- `get_paper` - Get paper details
- `download` - Download PDF
- `recent` - Recent papers

---

## System & Utilities (7 Servers)

### Shell - Command Execution

**Install**: `npx @modelcontextprotocol/server-shell`

**Tools** (3):

- `exec` - Execute command
- `exec_stream` - Execute with streaming
- `which` - Find executable

**Security Note**: Use with HITL approval for safety

### Time Utilities

**Install**: `npm -g @modelcontextprotocol/server-time`

**Tools** (6):

- `current_time` - Current time
- `convert_timezone` - Convert timezones
- `format` - Format timestamp
- `parse` - Parse date string
- `diff` - Calculate difference
- `add` - Add duration

### Memory - Persistent Storage

**Install**: `npx @modelcontextprotocol/server-memory`

**Tools** (4):

- `store` - Store value
- `retrieve` - Retrieve value
- `delete` - Delete value
- `list` - List keys

### Calculator - Math Operations

**Install**: `npm -g @modelcontextprotocol/server-calculator`

**Tools** (5):

- `calculate` - Evaluate expression
- `convert_units` - Unit conversion
- `statistics` - Statistical functions
- `financial` - Financial calculations
- `scientific` - Scientific functions

### Encryption - Crypto Operations

**Install**: `npm -g @modelcontextprotocol/server-encryption`

**Tools** (6):

- `encrypt` - Encrypt data
- `decrypt` - Decrypt data
- `hash` - Hash data
- `generate_key` - Generate key
- `sign` - Digital signature
- `verify` - Verify signature

### QR Code Generator

**Install**: `npm -g @modelcontextprotocol/server-qr-code`

**Tools** (3):

- `generate` - Generate QR code
- `read` - Read QR code
- `encode_url` - Encode URL

### Image Processing

**Install**: `npm -g @modelcontextprotocol/server-image`

**Tools** (8):

- `resize` - Resize image
- `convert` - Convert format
- `crop` - Crop image
- `rotate` - Rotate image
- `compress` - Compress image
- `watermark` - Add watermark
- `thumbnail` - Generate thumbnail
- `metadata` - Extract metadata

---

## Adding MCP Servers

### Dynamic Addition (SDK)

Add MCP servers programmatically at runtime:

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

// Add official MCP server
await neurolink.addMCPServer("github", {
  command: "npx",
  args: ["-y", "@modelcontextprotocol/server-github"],
  env: {
    GITHUB_PERSONAL_ACCESS_TOKEN: process.env.GITHUB_TOKEN,
  },
});

// Add custom MCP server
await neurolink.addMCPServer("custom-analytics", {
  command: "node",
  args: ["./analytics-mcp-server.js"],
  env: {
    DATABASE_URL: process.env.ANALYTICS_DB,
    API_KEY: process.env.ANALYTICS_KEY,
  },
  cwd: "/path/to/server",
});

// Add remote MCP server (SSE transport)
await neurolink.addMCPServer("remote-tools", {
  command: "http://mcp.company.com/tools",
  transport: "sse",
  url: "http://mcp.company.com/tools/mcp",
  env: {
    AUTH_TOKEN: process.env.MCP_AUTH_TOKEN,
  },
});

// Verify servers registered
const status = await neurolink.getMCPStatus();
console.log(`Total servers: ${status.totalServers}`);
console.log(`Available tools: ${status.totalTools}`);
```

### Configuration File

Static configuration in `.mcp-config.json`:

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/"],
      "transport": "stdio"
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "transport": "stdio",
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_TOKEN}"
      }
    },
    "postgres": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres"],
      "transport": "stdio",
      "env": {
        "POSTGRES_CONNECTION_STRING": "${DATABASE_URL}"
      }
    }
  }
}
```

### Environment Variables

Configure via environment variables:

```bash
# Server URLs
export MCP_GITHUB_SERVER="npx @modelcontextprotocol/server-github"
export MCP_POSTGRES_SERVER="npx @modelcontextprotocol/server-postgres"

# Authentication
export GITHUB_TOKEN="ghp_your_token"
export DATABASE_URL="postgresql://user:pass@localhost:5432/db"
export SLACK_BOT_TOKEN="xoxb-your-token"

# Server-specific configuration
export MCP_FILESYSTEM_ROOT="/allowed/directory"
export MCP_PUPPETEER_HEADLESS="true"
```

---

## Tool Discovery

### CLI Discovery

```bash
npx @juspay/neurolink mcp discover

📋 Available MCP Servers (8):
╔═══════════════╦═════════════╦══════════════╗
║ Server        ║ Status      ║ Tools        ║
╠═══════════════╬═════════════╬══════════════╣
║ filesystem    ║ ✅ Active   ║ 9 tools      ║
║ github        ║ ✅ Active   ║ 15 tools     ║
║ postgres      ║ ✅ Active   ║ 8 tools      ║
║ slack         ║ ✅ Active   ║ 10 tools     ║
║ google-drive  ║ ✅ Active   ║ 12 tools     ║
║ puppeteer     ║ ✅ Active   ║ 11 tools     ║
║ docker        ║ ❌ Inactive ║ 0 tools      ║
║ custom        ║ ✅ Active   ║ 5 tools      ║
╚═══════════════╩═════════════╩══════════════╝

Total: 70 tools available

💡 Use 'neurolink mcp test <server>' to test connectivity
```

### SDK Discovery

```typescript
const neurolink = new NeuroLink();

// Discover all tools
const tools = await neurolink.discoverTools();

console.log(`Total tools: ${tools.length}`);

// Group by server
const byServer = tools.reduce((acc, tool) => {
  if (!acc[tool.server]) acc[tool.server] = [];
  acc[tool.server].push(tool.name);
  return acc;
}, {});

console.log("Tools by server:", byServer);

// Filter specific capabilities
const fileTools = tools.filter(
  (t) =>
    t.name.includes("file") ||
    t.name.includes("read") ||
    t.name.includes("write"),
);

console.log(
  "File-related tools:",
  fileTools.map((t) => t.name),
);
```

---

## Enterprise MCP Patterns

### Custom MCP Server Development

Create your own MCP server for enterprise integration:

```typescript
// custom-crm-server.ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const server = new Server(
  {
    name: "custom-crm",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

// Register tools
server.setRequestHandler("tools/list", async () => {
  return {
    tools: [
      {
        name: "get_customer",
        description: "Get customer details from CRM",
        inputSchema: {
          type: "object",
          properties: {
            customerId: {
              type: "string",
              description: "Customer ID",
            },
          },
          required: ["customerId"],
        },
      },
      {
        name: "create_lead",
        description: "Create new lead in CRM",
        inputSchema: {
          type: "object",
          properties: {
            name: { type: "string" },
            email: { type: "string" },
            company: { type: "string" },
          },
          required: ["name", "email"],
        },
      },
    ],
  };
});

// Handle tool execution
server.setRequestHandler("tools/call", async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case "get_customer":
      const customer = await fetchCustomerFromCRM(args.customerId);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(customer, null, 2),
          },
        ],
      };

    case "create_lead":
      const lead = await createLeadInCRM(args);
      return {
        content: [
          {
            type: "text",
            text: `Lead created: ${lead.id}`,
          },
        ],
      };

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

// Start server
const transport = new StdioServerTransport();
await server.connect(transport);
```

**Using custom server**:

```typescript
await neurolink.addMCPServer("crm", {
  command: "node",
  args: ["./custom-crm-server.js"],
  env: {
    CRM_API_KEY: process.env.CRM_API_KEY,
    CRM_ENDPOINT: process.env.CRM_ENDPOINT,
  },
});
```

### Security Considerations

#### 1. Tool Sandboxing

```typescript
// Restrict filesystem access
await neurolink.addMCPServer("filesystem", {
  command: "npx",
  args: [
    "-y",
    "@modelcontextprotocol/server-filesystem",
    "/allowed/directory/only", // Restrict to specific directory
  ],
});

// Use HITL for dangerous operations
const neurolink = new NeuroLink({
  hitl: {
    enabled: true,
    requireApproval: ["writeFile", "deleteFile", "executeCode", "shell_exec"],
  },
});
```

#### 2. Permission System

```typescript
// Define permissions per tool
const neurolink = new NeuroLink({
  tools: {
    permissions: {
      readFile: ["admin", "developer", "viewer"],
      writeFile: ["admin", "developer"],
      deleteFile: ["admin"],
      executeCode: ["admin"],
    },
  },
});

// Enforce in context
const result = await neurolink.generate({
  input: { text: "Delete old log files" },
  context: {
    userId: "user123",
    role: "viewer", // Will fail - no delete permission
  },
});
```

#### 3. Audit Logging

```typescript
const neurolink = new NeuroLink({
  audit: {
    enabled: true,
    logAllTools: true,
    storage: "database",
    database: {
      url: process.env.AUDIT_DB_URL,
    },
  },
});

// Audit log entry format
{
  timestamp: "2025-01-01T14:30:00Z",
  userId: "user123",
  tool: "writeFile",
  args: { path: "/data/report.pdf", size: 1024 },
  approved: true,
  approver: "manager@company.com",
  result: { success: true }
}
```

### Performance Optimization

#### 1. Connection Pooling

```typescript
// Reuse database connections
await neurolink.addMCPServer("postgres", {
  command: "npx",
  args: ["-y", "@modelcontextprotocol/server-postgres"],
  env: {
    POSTGRES_CONNECTION_STRING: process.env.DATABASE_URL,
    POSTGRES_POOL_SIZE: "20", // Connection pool
    POSTGRES_POOL_TIMEOUT: "30000",
  },
});
```

#### 2. Result Caching

```typescript
const neurolink = new NeuroLink({
  tools: {
    cache: {
      enabled: true,
      ttl: 300, // 5 minutes
      maxSize: 1000, // Max cached results
    },
  },
});

// Tools with read-only operations cache results
const result1 = await neurolink.generate({
  input: { text: "Get customer 123 details" },
}); // Cache miss - fetches from CRM

const result2 = await neurolink.generate({
  input: { text: "Get customer 123 details" },
}); // Cache hit - instant response
```

#### 3. Timeout Handling

```typescript
await neurolink.addMCPServer("slow-api", {
  command: "npx",
  args: ["-y", "slow-mcp-server"],
  timeout: 30000, // 30 second timeout
  retry: {
    enabled: true,
    maxAttempts: 3,
    backoff: "exponential",
  },
});
```

---

## See Also

- [MCP Integration Guide](../advanced/mcp-integration.md) - Deep dive into MCP architecture
- [MCP Server Catalog](../guides/mcp/server-catalog.md) - Complete MCP server directory
- [Custom Tools](../sdk/custom-tools.md) - Building custom MCP servers
- [Enterprise HITL](enterprise-hitl.md) - HITL for tool approval workflows
- [Interactive CLI](interactive-cli.md) - Using MCP tools in CLI loop mode
- [MCP Foundation](../mcp-foundation.md) - MCP architecture documentation
