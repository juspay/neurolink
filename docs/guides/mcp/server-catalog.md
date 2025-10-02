---
title: MCP Server Catalog
description: Complete catalog of 58+ MCP servers for filesystems, databases, APIs, and external tools
keywords: mcp servers, model context protocol, tools, integrations, filesystem, database
---

# MCP External Servers Catalog

**Comprehensive directory of 58+ Model Context Protocol servers for extending AI capabilities**

---

## Overview

The Model Context Protocol (MCP) enables AI models to interact with external tools and data sources through standardized servers. This catalog lists 58+ community and official MCP servers you can integrate with NeuroLink to extend your AI applications.

### What is MCP?

MCP is an open protocol that standardizes how AI applications connect to external data sources and tools. Think of it as USB-C for AI - one universal standard for connecting AI models to any tool or data source.

### Categories

- **🗄️ Data & Storage** (12 servers): Databases, file systems, cloud storage
- **🌐 Web & APIs** (10 servers): Web scraping, HTTP clients, REST APIs
- **💻 Development Tools** (15 servers): Git, Docker, package managers
- **📊 Productivity** (8 servers): Google Drive, Notion, Slack, Email
- **🔍 Search & Knowledge** (6 servers): Web search, knowledge bases
- **🔧 System & Utilities** (7 servers): System operations, monitoring

---

## Quick Start

### Installing an MCP Server

```typescript
import { NeuroLink } from "@juspay/neurolink";

const ai = new NeuroLink({
  providers: [
    {
      name: "anthropic",
      config: { apiKey: process.env.ANTHROPIC_API_KEY },
    },
  ],
  mcpServers: [
    {
      name: "filesystem",
      command: "npx",
      args: [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "/Users/yourname/Documents",
      ],
      description: "Access local filesystem",
    },
    {
      name: "github",
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-github"],
      env: {
        GITHUB_PERSONAL_ACCESS_TOKEN: process.env.GITHUB_TOKEN,
      },
      description: "Interact with GitHub repositories",
    },
  ],
});

// Use MCP tools
const result = await ai.generate({
  input: { text: "List files in my Documents folder" },
  provider: "anthropic",
  tools: "auto", // Automatically uses MCP tools
});
```

---

## Official MCP Servers

### @modelcontextprotocol/server-filesystem

**Access local filesystem with read/write capabilities**

```bash
# Install
npx -y @modelcontextprotocol/server-filesystem [allowed-directory]
```

**Features:**

- Read files and directories
- Write and create files
- Search file contents
- Move and delete files
- Get file metadata

**Use Cases:**

- Document processing
- Code analysis
- Log file analysis
- Automated file management

**Configuration:**

```typescript
mcpServers: [
  {
    name: "filesystem",
    command: "npx",
    args: [
      "-y",
      "@modelcontextprotocol/server-filesystem",
      "/Users/yourname/Documents",
    ],
    description: "Access Documents folder",
  },
];
```

**Example Usage:**

```
User: "Summarize all markdown files in my Documents"
AI: *uses filesystem server to read .md files, then summarizes*
```

---

### @modelcontextprotocol/server-github

**Complete GitHub integration**

```bash
# Install
npm install -g @modelcontextprotocol/server-github

# Set token
export GITHUB_PERSONAL_ACCESS_TOKEN=ghp_your_token
```

**Features:**

- Search repositories
- Create/update issues and PRs
- Read file contents
- Manage branches
- Search code
- List commits

**Use Cases:**

- Automated code reviews
- Issue management
- Repository analysis
- CI/CD integration

**Configuration:**

```typescript
mcpServers: [
  {
    name: "github",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-github"],
    env: {
      GITHUB_PERSONAL_ACCESS_TOKEN: process.env.GITHUB_TOKEN,
    },
  },
];
```

**Example Usage:**

```
User: "Create an issue in my repo about the authentication bug"
AI: *creates GitHub issue with description*
```

---

### @modelcontextprotocol/server-postgres

**PostgreSQL database access**

```bash
# Install
npm install -g @modelcontextprotocol/server-postgres
```

**Features:**

- Execute SQL queries
- List schemas and tables
- Analyze query performance
- Database introspection

**Configuration:**

```typescript
mcpServers: [
  {
    name: "postgres",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-postgres"],
    env: {
      POSTGRES_CONNECTION_STRING: "postgresql://user:pass@localhost:5432/mydb",
    },
  },
];
```

**Example Usage:**

```
User: "How many users signed up this month?"
AI: *queries database and provides count*
```

---

### @modelcontextprotocol/server-google-drive

**Google Drive integration**

```bash
npm install -g @modelcontextprotocol/server-google-drive
```

**Features:**

- Search files and folders
- Read document contents
- Upload files
- Share files
- Manage permissions

**Configuration:**

```typescript
mcpServers: [
  {
    name: "gdrive",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-google-drive"],
    env: {
      GOOGLE_APPLICATION_CREDENTIALS: "/path/to/credentials.json",
    },
  },
];
```

---

### @modelcontextprotocol/server-slack

**Slack workspace integration**

**Features:**

- Send messages
- Read channel history
- Search messages
- Manage channels
- User information

**Configuration:**

```typescript
mcpServers: [
  {
    name: "slack",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-slack"],
    env: {
      SLACK_BOT_TOKEN: process.env.SLACK_BOT_TOKEN,
      SLACK_TEAM_ID: process.env.SLACK_TEAM_ID,
    },
  },
];
```

---

## Data & Storage Servers (12)

### Databases

| Server       | Description           | Install                                       | Auth              |
| ------------ | --------------------- | --------------------------------------------- | ----------------- |
| **postgres** | PostgreSQL database   | `npx @modelcontextprotocol/server-postgres`   | Connection string |
| **sqlite**   | SQLite database       | `npx @modelcontextprotocol/server-sqlite`     | File path         |
| **mysql**    | MySQL/MariaDB         | `npx @modelcontextprotocol/server-mysql`      | Connection string |
| **mongodb**  | MongoDB database      | `npm -g @modelcontextprotocol/server-mongodb` | Connection string |
| **redis**    | Redis key-value store | `npm -g @modelcontextprotocol/server-redis`   | Connection string |

### File Systems & Cloud Storage

| Server           | Description        | Install                                          | Auth              |
| ---------------- | ------------------ | ------------------------------------------------ | ----------------- |
| **filesystem**   | Local filesystem   | `npx @modelcontextprotocol/server-filesystem`    | Directory path    |
| **google-drive** | Google Drive       | `npx @modelcontextprotocol/server-google-drive`  | OAuth credentials |
| **aws-s3**       | Amazon S3 storage  | `npm -g @modelcontextprotocol/server-aws-s3`     | AWS credentials   |
| **azure-blob**   | Azure Blob Storage | `npm -g @modelcontextprotocol/server-azure-blob` | Azure credentials |
| **dropbox**      | Dropbox storage    | `npm -g @modelcontextprotocol/server-dropbox`    | OAuth token       |

---

## Web & APIs Servers (10)

| Server            | Description          | Install                                             | Key Features               |
| ----------------- | -------------------- | --------------------------------------------------- | -------------------------- |
| **fetch**         | HTTP client          | `npx @modelcontextprotocol/server-fetch`            | GET/POST requests, headers |
| **puppeteer**     | Browser automation   | `npx @modelcontextprotocol/server-puppeteer`        | Web scraping, screenshots  |
| **brave-search**  | Brave Search API     | `npm -g @modelcontextprotocol/server-brave-search`  | Web search, news           |
| **google-search** | Google Custom Search | `npm -g @modelcontextprotocol/server-google-search` | Web search, images         |
| **exa**           | Exa search engine    | `npm -g @modelcontextprotocol/server-exa`           | Semantic web search        |
| **weather**       | Weather data         | `npm -g @modelcontextprotocol/server-weather`       | Current & forecast         |
| **news**          | News aggregator      | `npm -g @modelcontextprotocol/server-news`          | Latest news articles       |
| **rss**           | RSS feed reader      | `npm -g @modelcontextprotocol/server-rss`           | Feed parsing               |
| **http-api**      | Generic HTTP API     | `npm -g @modelcontextprotocol/server-http-api`      | REST API client            |
| **graphql**       | GraphQL client       | `npm -g @modelcontextprotocol/server-graphql`       | GraphQL queries            |

---

## Development Tools Servers (15)

### Version Control

| Server     | Description          | Install                                      | Features                 |
| ---------- | -------------------- | -------------------------------------------- | ------------------------ |
| **github** | GitHub API           | `npx @modelcontextprotocol/server-github`    | Repos, issues, PRs       |
| **gitlab** | GitLab API           | `npm -g @modelcontextprotocol/server-gitlab` | Projects, merge requests |
| **git**    | Local Git operations | `npx @modelcontextprotocol/server-git`       | Commit, branch, diff     |

### CI/CD & DevOps

| Server         | Description            | Install                                          | Features           |
| -------------- | ---------------------- | ------------------------------------------------ | ------------------ |
| **docker**     | Docker management      | `npm -g @modelcontextprotocol/server-docker`     | Containers, images |
| **kubernetes** | K8s cluster mgmt       | `npm -g @modelcontextprotocol/server-kubernetes` | Pods, deployments  |
| **terraform**  | Infrastructure as code | `npm -g @modelcontextprotocol/server-terraform`  | Plan, apply, state |
| **aws**        | AWS operations         | `npm -g @modelcontextprotocol/server-aws`        | EC2, S3, Lambda    |
| **gcp**        | Google Cloud           | `npm -g @modelcontextprotocol/server-gcp`        | Compute, storage   |
| **azure**      | Microsoft Azure        | `npm -g @modelcontextprotocol/server-azure`      | VMs, storage       |

### Package Managers

| Server    | Description     | Install                                     | Features              |
| --------- | --------------- | ------------------------------------------- | --------------------- |
| **npm**   | NPM packages    | `npx @modelcontextprotocol/server-npm`      | Search, install, info |
| **pip**   | Python packages | `npm -g @modelcontextprotocol/server-pip`   | Search, install       |
| **cargo** | Rust packages   | `npm -g @modelcontextprotocol/server-cargo` | Crates.io search      |

---

## Productivity Servers (8)

| Server              | Description      | Install                                               | Key Features        |
| ------------------- | ---------------- | ----------------------------------------------------- | ------------------- |
| **google-drive**    | Google Drive     | `npx @modelcontextprotocol/server-google-drive`       | Files, docs, sheets |
| **google-calendar** | Google Calendar  | `npm -g @modelcontextprotocol/server-google-calendar` | Events, scheduling  |
| **google-gmail**    | Gmail            | `npm -g @modelcontextprotocol/server-google-gmail`    | Send, read emails   |
| **slack**           | Slack workspace  | `npx @modelcontextprotocol/server-slack`              | Messages, channels  |
| **notion**          | Notion workspace | `npm -g @modelcontextprotocol/server-notion`          | Pages, databases    |
| **trello**          | Trello boards    | `npm -g @modelcontextprotocol/server-trello`          | Cards, lists        |
| **jira**            | Jira issues      | `npm -g @modelcontextprotocol/server-jira`            | Issues, sprints     |
| **linear**          | Linear issues    | `npm -g @modelcontextprotocol/server-linear`          | Issues, projects    |

---

## Search & Knowledge Servers (6)

| Server            | Description     | Install                                             | Use Case                |
| ----------------- | --------------- | --------------------------------------------------- | ----------------------- |
| **brave-search**  | Web search      | `npm -g @modelcontextprotocol/server-brave-search`  | General web search      |
| **google-search** | Google search   | `npm -g @modelcontextprotocol/server-google-search` | Web & image search      |
| **exa**           | Semantic search | `npm -g @modelcontextprotocol/server-exa`           | AI-powered search       |
| **wikipedia**     | Wikipedia       | `npm -g @modelcontextprotocol/server-wikipedia`     | Encyclopedia lookup     |
| **wolfram**       | Wolfram Alpha   | `npm -g @modelcontextprotocol/server-wolfram`       | Computational knowledge |
| **arxiv**         | Research papers | `npm -g @modelcontextprotocol/server-arxiv`         | Academic papers         |

---

## System & Utilities Servers (7)

| Server         | Description       | Install                                          | Features              |
| -------------- | ----------------- | ------------------------------------------------ | --------------------- |
| **shell**      | Shell commands    | `npx @modelcontextprotocol/server-shell`         | Execute commands      |
| **time**       | Time utilities    | `npm -g @modelcontextprotocol/server-time`       | Timezones, formatting |
| **memory**     | Persistent memory | `npx @modelcontextprotocol/server-memory`        | Store/retrieve data   |
| **calculator** | Math operations   | `npm -g @modelcontextprotocol/server-calculator` | Calculations          |
| **encryption** | Crypto operations | `npm -g @modelcontextprotocol/server-encryption` | Encrypt/decrypt       |
| **qr-code**    | QR code generator | `npm -g @modelcontextprotocol/server-qr-code`    | Generate QR codes     |
| **image**      | Image processing  | `npm -g @modelcontextprotocol/server-image`      | Resize, convert       |

---

## Advanced Integrations

### Multi-Server Setup

```typescript
const ai = new NeuroLink({
  providers: [
    { name: "anthropic", config: { apiKey: process.env.ANTHROPIC_API_KEY } },
  ],
  mcpServers: [
    // Filesystem access
    {
      name: "filesystem",
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-filesystem", process.cwd()],
    },

    // GitHub integration
    {
      name: "github",
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-github"],
      env: { GITHUB_PERSONAL_ACCESS_TOKEN: process.env.GITHUB_TOKEN },
    },

    // PostgreSQL database
    {
      name: "postgres",
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-postgres"],
      env: { POSTGRES_CONNECTION_STRING: process.env.DATABASE_URL },
    },

    // Web search
    {
      name: "brave-search",
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-brave-search"],
      env: { BRAVE_API_KEY: process.env.BRAVE_API_KEY },
    },

    // Slack integration
    {
      name: "slack",
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-slack"],
      env: {
        SLACK_BOT_TOKEN: process.env.SLACK_BOT_TOKEN,
        SLACK_TEAM_ID: process.env.SLACK_TEAM_ID,
      },
    },
  ],
});

// AI can now use all these tools automatically
const result = await ai.generate({
  input: {
    text: `
      1. Search for "TypeScript best practices"
      2. Create a GitHub issue with the findings
      3. Query our users table for signup trends
      4. Send summary to #engineering Slack channel
    `,
  },
  provider: "anthropic",
  model: "claude-3-5-sonnet-20241022",
  tools: "auto",
});
```

### Custom MCP Server

Create your own MCP server:

```typescript
// my-custom-server.ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const server = new Server(
  {
    name: "my-custom-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

// Define custom tools
server.setRequestHandler("tools/list", async () => ({
  tools: [
    {
      name: "custom_api_call",
      description: "Call my custom API",
      inputSchema: {
        type: "object",
        properties: {
          endpoint: { type: "string" },
          method: { type: "string", enum: ["GET", "POST"] },
        },
        required: ["endpoint"],
      },
    },
  ],
}));

server.setRequestHandler("tools/call", async (request) => {
  if (request.params.name === "custom_api_call") {
    const { endpoint, method = "GET" } = request.params.arguments;

    const response = await fetch(`https://myapi.com/${endpoint}`, {
      method,
      headers: { Authorization: `Bearer ${process.env.API_KEY}` },
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(await response.json(), null, 2),
        },
      ],
    };
  }

  throw new Error("Unknown tool");
});

// Start server
const transport = new StdioServerTransport();
await server.connect(transport);
```

Use custom server:

```typescript
mcpServers: [
  {
    name: "my-custom-server",
    command: "node",
    args: ["./my-custom-server.js"],
    env: {
      API_KEY: process.env.MY_API_KEY,
    },
  },
];
```

---

## Use Case Examples

### 1. Code Review Automation

```typescript
const ai = new NeuroLink({
  providers: [
    { name: "anthropic", config: { apiKey: process.env.ANTHROPIC_API_KEY } },
  ],
  mcpServers: [
    {
      name: "github",
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-github"],
    },
    {
      name: "filesystem",
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-filesystem", "./"],
    },
  ],
});

const result = await ai.generate({
  input: { text: "Review all open PRs in my repo and suggest improvements" },
  tools: "auto",
});
```

### 2. Database Analytics

```typescript
const ai = new NeuroLink({
  providers: [
    { name: "anthropic", config: { apiKey: process.env.ANTHROPIC_API_KEY } },
  ],
  mcpServers: [
    {
      name: "postgres",
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-postgres"],
      env: { POSTGRES_CONNECTION_STRING: process.env.DATABASE_URL },
    },
  ],
});

const result = await ai.generate({
  input: {
    text: "Analyze user signup trends for the past 3 months and identify patterns",
  },
  tools: "auto",
});
```

### 3. Customer Support Automation

```typescript
const ai = new NeuroLink({
  providers: [
    { name: "anthropic", config: { apiKey: process.env.ANTHROPIC_API_KEY } },
  ],
  mcpServers: [
    {
      name: "slack",
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-slack"],
    },
    {
      name: "jira",
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-jira"],
    },
    {
      name: "notion",
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-notion"],
    },
  ],
});

const result = await ai.generate({
  input: {
    text: `
      1. Read recent support tickets from Jira
      2. Categorize by priority
      3. Create summary in Notion
      4. Alert #support channel in Slack for P0 issues
    `,
  },
  tools: "auto",
});
```

---

## Best Practices

### 1. ✅ Limit Server Permissions

```typescript
// ✅ Good: Restrict filesystem access
mcpServers: [
  {
    name: "filesystem",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-filesystem", "/safe/directory"],
    // Not entire system: '/'
  },
];
```

### 2. ✅ Use Environment Variables for Secrets

```typescript
// ✅ Good: Store secrets in env vars
env: {
  GITHUB_PERSONAL_ACCESS_TOKEN: process.env.GITHUB_TOKEN; // From .env
  // Not hardcoded: 'ghp_abc123...'
}
```

### 3. ✅ Test Servers Individually

```typescript
// ✅ Test each server works before combining
const testServer = new NeuroLink({
  mcpServers: [
    {
      name: "github", // Test one at a time
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-github"],
    },
  ],
});
```

### 4. ✅ Monitor MCP Server Usage

```typescript
// ✅ Track which MCP tools are used
const result = await ai.generate({
  input: { text: "Your prompt" },
  tools: "auto",
  onToolCall: (toolName, args) => {
    console.log(`MCP tool called: ${toolName}`, args);
    metrics.increment("mcp.tool.usage", { tool: toolName });
  },
});
```

### 5. ✅ Handle Server Failures Gracefully

```typescript
// ✅ Provide fallback when MCP server fails
try {
  const result = await ai.generate({
    input: { text: "Search GitHub for TypeScript repos" },
    tools: "auto",
  });
} catch (error) {
  if (error.message.includes("MCP server")) {
    console.error("MCP server unavailable, using basic search");
    // Fallback to non-MCP approach
  }
  throw error;
}
```

---

## Troubleshooting

### Server Won't Start

**Problem**: MCP server fails to initialize.

**Solution**:

```bash
# Test server manually
npx @modelcontextprotocol/server-github

# Check logs
DEBUG=mcp:* npx @modelcontextprotocol/server-github

# Verify installation
npm list -g | grep modelcontextprotocol
```

### Authentication Errors

**Problem**: Server can't authenticate with external service.

**Solution**:

```bash
# Verify environment variables
echo $GITHUB_PERSONAL_ACCESS_TOKEN

# Check token permissions
# - GitHub: repo, read:org scopes required
# - Google: OAuth scopes must include drive.readonly
```

### Tool Not Available

**Problem**: AI can't see MCP tools.

**Solution**:

```typescript
// Verify server is loaded
console.log(ai.listMCPServers());

// Explicitly enable tools
const result = await ai.generate({
  input: { text: "Your prompt" },
  tools: "auto", // Must be 'auto' or specific tool list
  provider: "anthropic", // MCP requires Claude 3.5+
});
```

---

## Related Documentation

- **[MCP Integration Guide](../../advanced/mcp-integration.md)** - Detailed MCP setup
- **[Custom Tools](../../sdk/custom-tools.md)** - Create and use custom MCP servers
- **[Security](../enterprise/compliance.md)** - MCP security best practices

---

## Additional Resources

- **[MCP Specification](https://spec.modelcontextprotocol.io/)** - Official protocol spec
- **[MCP GitHub](https://github.com/modelcontextprotocol)** - Source code
- **[Server Registry](https://github.com/modelcontextprotocol/servers)** - Official servers
- **[Community Servers](https://github.com/topics/mcp-server)** - Community contributions

---

**Need Help?** Join our [GitHub Discussions](https://github.com/juspay/neurolink/discussions) or open an [issue](https://github.com/juspay/neurolink/issues).
