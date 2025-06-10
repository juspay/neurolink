# @juspay/neurolink

## 1.4.0

### Major Changes

- **📚 MCP Documentation Master Plan**: Complete external server connectivity documentation
  - **🔧 MCP Integration Guide**: 400+ line comprehensive setup and usage guide
  - **📖 CLI Documentation**: Complete MCP commands section with workflows
  - **🧪 Demo Integration**: 5 MCP API endpoints for testing and demonstration
  - **⚙️ Configuration Templates**: .env.example and .mcp-servers.example.json
  - **📋 API Reference**: Complete MCP API documentation with examples

### Features

- **External Server Connectivity**: Full MCP (Model Context Protocol) support
- **65+ Compatible Servers**: Filesystem, GitHub, databases, web browsing, search
- **Professional CLI**: Complete server lifecycle management
- **Demo Server Integration**: Live MCP API endpoints
- **Configuration Management**: Templates and examples for all deployment scenarios

### MCP Server Support

```bash
# Install and manage external servers
neurolink mcp install filesystem
neurolink mcp install github
neurolink mcp test filesystem
neurolink mcp list --status
neurolink mcp execute filesystem read_file --path="/path/to/file"
```

### MCP API Endpoints

```typescript
// Demo server includes 5 MCP endpoints
GET  /api/mcp/servers          # List configured servers
POST /api/mcp/test/:server     # Test server connectivity
GET  /api/mcp/tools/:server    # Get available tools
POST /api/mcp/execute          # Execute MCP tools
POST /api/mcp/install/:server  # Install new servers
```

### Documentation Updates

- **README.md**: Complete MCP section with real-world examples
- **docs/MCP-INTEGRATION.md**: 400+ line comprehensive MCP guide
- **docs/CLI-GUIDE.md**: MCP commands section with workflow examples
- **docs/API-REFERENCE.md**: Complete MCP API documentation
- **docs/README.md**: Updated documentation index with MCP references

### Configuration

- **.env.example**: MCP environment variables section
- **.mcp-servers.example.json**: Complete server configuration template
- **package.json**: Updated description highlighting MCP capabilities

### Breaking Changes

- None - 100% backward compatibility maintained

## 1.3.0

### Major Changes

- **🎉 MCP Foundation (Model Context Protocol)**: NeuroLink transforms from AI SDK to Universal AI Development Platform
  - **🏭 MCP Server Factory**: Lighthouse-compatible server creation with `createMCPServer()`
  - **🧠 Context Management**: Rich context with 15+ fields + tool chain tracking
  - **📋 Tool Registry**: Discovery, registration, execution + statistics
  - **🎼 Tool Orchestration**: Single tools + sequential pipelines + error handling
  - **🤖 AI Provider Integration**: Core AI tools with schema validation
  - **🔗 Integration Tests**: 27/27 tests passing (100% success rate)

### Features

- **Factory-First Architecture**: MCP tools work internally, users see simple factory methods
- **Lighthouse Compatible**: 99% compatible with existing Lighthouse MCP patterns
- **Enterprise Ready**: Rich context, permissions, tool orchestration, analytics
- **Production Tested**: <1ms tool execution, comprehensive error handling

### Performance

- **Test Execution**: 1.23s for 27 comprehensive tests
- **Tool Execution**: 0-11ms per tool (well under 100ms target)
- **Pipeline Performance**: 22ms for 2-step sequential pipeline
- **Memory Efficiency**: Clean context management with automatic cleanup

### Technical Implementation

```typescript
src/lib/mcp/
├── factory.ts                  # createMCPServer() - Lighthouse compatible
├── context-manager.ts          # Rich context (15+ fields) + tool chain tracking
├── registry.ts                 # Tool discovery, registration, execution + statistics
├── orchestrator.ts             # Single tools + sequential pipelines + error handling
└── servers/ai-providers/       # AI Core Server with 3 tools integrated
    └── ai-core-server.ts       # generate-text, select-provider, check-provider-status
```

### Breaking Changes

- None - 100% backward compatibility maintained

## 1.2.4

### Patch Changes

- 95d8ee6: Set up automated version bumping and publishing workflow with changesets integration
