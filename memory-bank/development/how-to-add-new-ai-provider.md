# 🚀 How to Add a New AI Provider to NeuroLink

**Document Type**: Developer Guide
**Last Updated**: December 6, 2025
**Source**: Extracted from Google AI Studio integration experience
**Purpose**: Complete checklist for adding new AI providers to NeuroLink

---

## 📋 **INTEGRATION CHECKLIST OVERVIEW**

When adding a new AI provider, follow this **6-phase approach** for complete integration:

1. **Phase 1: Core Functionality** (Essential)
2. **Phase 2: Documentation** (Essential)
3. **Phase 3: Examples & Demos** (Essential)
4. **Phase 4: Configuration** (Essential)
5. **Phase 5: Test Integration** (Essential)
6. **Phase 6: Visual Content** (Optional but Recommended)

---

## 🏗️ **PHASE 1: CORE FUNCTIONALITY**

### **✅ Provider Implementation**

#### **1.1 Create Provider File**

- **Location**: `src/lib/providers/{providerName}.ts`
- **Naming**: Use CamelCase (e.g., `googleAIStudio.ts`, `amazonBedrock.ts`)
- **Class Name**: Match file name (e.g., `GoogleAIStudio`, `AmazonBedrock`)

#### **1.2 Provider Implementation Pattern**

```typescript
// Standard Provider Implementation Template
import { AIProvider, TextGenerationOptions } from "../types/index.js";

export class YourProvider implements AIProvider {
  constructor(modelName?: string) {
    // Initialize with model configuration
  }

  async generateText(
    optionsOrPrompt: TextGenerationOptions | string,
  ): Promise<string> {
    // Support both string and options parameter formats
    const options =
      typeof optionsOrPrompt === "string"
        ? { prompt: optionsOrPrompt }
        : optionsOrPrompt;

    // Implementation logic
  }

  async generateTextStream(
    optionsOrPrompt: TextGenerationOptions | string,
  ): Promise<AsyncIterable<string>> {
    // Streaming implementation
  }
}
```

#### **1.3 Export Provider**

- **File**: `src/lib/providers/index.ts`
- **Add Export**: `export { YourProvider } from './yourProvider.js';`

### **✅ Factory Integration**

#### **1.4 Update Provider Factory**

- **File**: `src/lib/core/factory.ts`
- **Add Case**: Add provider case to `createProvider()` switch statement
- **Provider Aliases**: Support multiple aliases for user convenience

```typescript
case 'your-provider': case 'alternative-name':
  provider = new YourProvider(modelName);
  break;
```

#### **1.5 Update Provider Utils**

- **File**: `src/lib/utils/providerUtils.ts`
- **Priority Order**: Add to auto-selection priority array
- **Config Detection**: Add configuration detection function

```typescript
const hasYourProviderConfig = (): boolean => {
  return !!process.env.YOUR_PROVIDER_API_KEY;
};
```

### **✅ CLI Integration**

#### **1.6 Update CLI Commands**

- **File**: `src/cli/commands/config.ts`
- **Provider Choices**: Add to provider choice arrays
- **Interactive Setup**: Add configuration setup method

```typescript
// Add to provider choices
.choices(['openai', 'bedrock', 'vertex', 'your-provider', 'auto'])

// Add setup method
async setupYourProvider(): Promise<void> {
  // Provider-specific setup guidance
}
```

#### **1.7 Update CLI Index**

- **File**: `src/cli/index.ts`
- **Provider Options**: Ensure all commands include new provider

---

## 📚 **PHASE 2: DOCUMENTATION**

### **✅ API Documentation**

#### **2.1 API Reference**

- **File**: `docs/API-REFERENCE.md`
- **Add Section**: Complete usage examples with new provider
- **Code Examples**: Show both factory and direct instantiation

#### **2.2 CLI Documentation**

- **File**: `docs/CLI-GUIDE.md`
- **CLI Examples**: Show `--provider your-provider` usage
- **Configuration**: Document setup and configuration commands

#### **2.3 Environment Variables**

- **File**: `docs/ENVIRONMENT-VARIABLES.md`
- **Variables**: Document all required environment variables
- **Authentication**: Explain authentication setup process

#### **2.4 Provider Configuration**

- **File**: `docs/PROVIDER-CONFIGURATION.md`
- **Dedicated Section**: Complete setup guide for new provider
- **Troubleshooting**: Common issues and solutions

### **✅ Main Documentation**

#### **2.5 Main README**

- **File**: `README.md`
- **Provider Lists**: Update all provider mentions
- **Quick Start**: Include new provider in examples
- **Supported Providers**: Update count and feature matrix

#### **2.6 Package README**

- **File**: `package/README.md`
- **NPM Documentation**: Update for package distribution
- **Installation**: Include new provider dependencies

### **✅ Environment Configuration**

#### **2.7 Environment Example**

- **File**: `.env.example`
- **Add Variables**: All required environment variables with examples
- **Comments**: Clear setup instructions

---

## 🎮 **PHASE 3: EXAMPLES & DEMOS**

### **✅ Demo Applications**

#### **3.1 Main Demo Server**

- **File**: `neurolink-demo/server.js`
- **Provider Support**: Add to provider dropdown and API endpoints
- **Configuration**: Support provider-specific configuration

```javascript
function isProviderConfigured(provider) {
  switch (provider) {
    case "your-provider":
      return !!process.env.YOUR_PROVIDER_API_KEY;
  }
}
```

#### **3.2 Enhanced Demo Server**

- **File**: `neurolink-demo/enhanced-endpoints.js`
- **API Endpoints**: Ensure all endpoints support new provider
- **Error Handling**: Graceful handling when provider unconfigured

#### **3.3 Demo Documentation**

- **File**: `neurolink-demo/README.md`
- **Setup Instructions**: Include new provider configuration
- **Usage Examples**: Show provider selection in demo

### **✅ Framework Integration**

#### **3.4 Framework Examples**

- **File**: `docs/FRAMEWORK-INTEGRATION.md`
- **Integration Examples**: Show new provider in framework examples
- **Best Practices**: Provider-specific integration patterns

---

## ⚙️ **PHASE 4: CONFIGURATION**

### **✅ MCP Server Integration**

#### **4.1 AI Core Server**

- **File**: `src/lib/mcp/servers/ai-providers/ai-core-server.ts`
- **Tool Schemas**: Add provider to all tool parameter schemas
- **Provider Support**: Ensure all 3 core tools support new provider

#### **4.2 AI Analysis Tools**

- **File**: `src/lib/mcp/servers/ai-providers/ai-analysis-tools.ts`
- **Tool Schemas**: Add provider to analysis tool schemas
- **Provider Support**: All analysis tools must support new provider

#### **4.3 AI Workflow Tools**

- **File**: `src/lib/mcp/servers/ai-providers/ai-workflow-tools.ts`
- **Tool Schemas**: Add provider to workflow tool schemas
- **Provider Support**: All workflow tools must support new provider

---

## 🧪 **PHASE 5: TEST INTEGRATION**

### **✅ Provider Tests**

#### **5.1 Core Provider Tests**

- **File**: `src/test/providers.test.ts`
- **Test Cases**: Add provider creation and functionality tests
- **Mocking**: Include provider in mocking infrastructure

```typescript
// Add to test suite
test("should create YourProvider", () => {
  process.env.YOUR_PROVIDER_API_KEY = "test-key";
  const provider = AIProviderFactory.createProvider("your-provider");
  expect(provider).toBeInstanceOf(YourProvider);
});
```

#### **5.2 CLI Tests**

- **File**: `src/test/cli.test.ts`
- **Provider Validation**: Update CLI tests to include new provider
- **Command Testing**: Test provider-specific CLI commands

```typescript
// Update regex patterns
expect(output).toMatch(/(openai|bedrock|vertex|your-provider)/i);
```

#### **5.3 Comprehensive Tests**

- **File**: `src/test/cli-comprehensive.test.ts`
- **Provider Lists**: Update provider validation tests
- **Integration**: End-to-end testing with new provider

#### **5.4 Stress Tests**

- **File**: `src/test/stress.test.ts`
- **Load Testing**: Include provider in stress test scenarios
- **Provider Arrays**: Update provider iteration tests

### **✅ Environment Setup**

#### **5.5 Test Environment**

- **File**: `src/test/setup.ts`
- **Mock Variables**: Add provider environment variables to test setup
- **Provider Mocking**: Include in mock provider infrastructure

---

## 🎬 **PHASE 6: VISUAL CONTENT (OPTIONAL)**

### **✅ CLI Recordings**

#### **6.1 Create CLI Recordings**

- **Location**: `docs/cli-recordings/latest/`
- **Required Recordings**:
  - `{provider}-provider-list-updated.cast` - Shows provider in list
  - `{provider}-provider-configure.cast` - Configuration guidance
  - `cli-help-with-{provider}.cast` - Updated help text

#### **6.2 Recording Process**

```bash
# Start recording
asciinema rec docs/cli-recordings/latest/{provider}-demo.cast

# Record commands
node dist/cli/index.js provider list
node dist/cli/index.js provider configure your-provider
node dist/cli/index.js generate-text --help

# Stop recording (Ctrl+D)
```

### **✅ Screenshot Generation**

#### **6.3 Create Screenshot Script**

- **Location**: `scripts/create-{provider}-cli-screenshots.js`
- **Purpose**: Automated CLI screenshot generation
- **Coverage**: All major CLI commands with new provider

#### **6.4 Demo Video Script**

- **Location**: `scripts/create-{provider}-demo-video.js`
- **Purpose**: Playwright-based demo video creation
- **Coverage**: Web demo showing provider selection

### **✅ MP4 Conversion**

#### **6.5 Create Conversion Script**

- **Location**: `scripts/convert-{provider}-recordings-to-mp4.sh`
- **Purpose**: Convert .cast files to MP4 for universal compatibility
- **Output**: `docs/visual-content/cli-videos/{provider}-*.mp4`

---

## 🔍 **CRITICAL PATTERNS & CONVENTIONS**

### **📁 File Naming Conventions**

#### **Provider Files**

- **Provider Implementation**: `{providerName}.ts` (CamelCase)
- **Provider ID in Code**: `'provider-id'` (kebab-case)
- **Class Name**: `{ProviderName}` (PascalCase)
- **Import Path**: `../lib/providers/{providerName}.js`

#### **Visual Content**

- **CLI Recordings**: `{provider}-{purpose}.cast`
- **Screenshots**: `{provider}-{command}-{timestamp}.png`
- **Videos**: `{provider}-demo-{duration}s-{size}mb.mp4`

### **🔧 Authentication Patterns**

#### **Simple API Key**

```typescript
const apiKey = process.env.YOUR_PROVIDER_API_KEY;
if (!apiKey) {
  throw new Error("YOUR_PROVIDER_API_KEY environment variable is required");
}
```

#### **Complex Authentication**

```typescript
// Support multiple authentication methods
const hasMethod1 = () => !!process.env.PROVIDER_CONFIG_FILE;
const hasMethod2 = () => !!process.env.PROVIDER_JSON_KEY;
const hasMethod3 = () =>
  !!(process.env.PROVIDER_CLIENT_EMAIL && process.env.PROVIDER_PRIVATE_KEY);

// Check in order of preference
if (hasMethod1()) {
  // Use config file
} else if (hasMethod2()) {
  // Use JSON string with temp file creation
} else if (hasMethod3()) {
  // Use individual environment variables
}
```

### **🏭 Factory Integration Pattern**

#### **Provider Aliases**

```typescript
// Support multiple ways to reference the provider
case 'provider-name':
case 'provider-alias':
case 'short-name':
  provider = new YourProvider(modelName);
  break;
```

#### **Error Handling**

```typescript
// Clear error messages for unsupported configurations
default:
  throw new Error(`Unsupported provider: ${providerName}. Supported providers: openai, bedrock, vertex, anthropic, azure, google-ai, your-provider`);
```

### **📋 CLI Integration Pattern**

#### **Provider Choices**

```typescript
// Add to all relevant command option arrays
.choices(['auto', 'openai', 'bedrock', 'vertex', 'anthropic', 'azure', 'google-ai', 'your-provider'])
```

#### **Configuration Methods**

```typescript
async setupYourProvider(): Promise<void> {
  console.log('🔧 Configuration guidance for your-provider:');
  console.log('1. Get API key from https://provider-website.com');
  console.log('2. Set environment variable: YOUR_PROVIDER_API_KEY=your-key');
  console.log('3. Optional: Set model with YOUR_PROVIDER_MODEL=model-name');
}
```

---

## 🎯 **VALIDATION CHECKLIST**

### **✅ Functional Validation**

- [ ] Provider creates successfully: `AIProviderFactory.createProvider('your-provider')`
- [ ] Auto-selection includes provider: `createBestProvider()` can select it
- [ ] CLI commands work: `--provider your-provider` in all commands
- [ ] Environment detection: Provider only selected when configured
- [ ] Text generation: Both prompt string and options object work
- [ ] Streaming: Stream generation works if supported

### **✅ Integration Validation**

- [ ] All tests pass: `npm run test:run`
- [ ] CLI tests include provider: Provider appears in CLI output validation
- [ ] Demo server works: Provider available in web demo dropdown
- [ ] MCP integration: All 10 MCP tools support provider
- [ ] Documentation: All docs mention new provider

### **✅ Visual Content Validation**

- [ ] CLI recordings created: 3 main .cast files
- [ ] MP4 conversion works: .cast files converted to MP4
- [ ] Screenshots ready: Automation scripts created
- [ ] Demo videos: Provider shown in web interface

---

## 📊 **SUCCESS METRICS**

### **Completion Criteria**

- **Core Functionality**: 100% - Provider works in all scenarios
- **Documentation**: 100% - All 6 documentation files updated
- **Test Coverage**: 100% - All tests pass with provider included
- **Demo Integration**: 100% - Web demo supports provider
- **MCP Integration**: 100% - All 10 tools support provider
- **Visual Content**: 100% - CLI recordings and automation ready

### **Quality Standards**

- **Zero Test Failures**: All existing tests continue passing
- **Backward Compatibility**: No breaking changes to existing code
- **Error Handling**: Graceful failures with clear error messages
- **Performance**: <100ms provider initialization
- **Documentation**: Complete setup guides with examples

---

## 🚀 **POST-INTEGRATION TASKS**

### **Immediate**

1. **Test All Scenarios**: Manual testing with real credentials
2. **Update Version**: Increment package version for new provider
3. **Changelog**: Document provider addition in CHANGELOG.md
4. **Memory Bank**: Update memory bank with integration learnings

### **Medium Term**

1. **User Documentation**: Create user guides and tutorials
2. **Video Content**: Create professional demo videos
3. **Blog Post**: Announce new provider support
4. **Community**: Share integration with community

### **Optional**

1. **Advanced Features**: Provider-specific optimizations
2. **Performance**: Provider-specific performance tuning
3. **Monitoring**: Usage analytics for new provider
4. **Support**: Create provider-specific troubleshooting guides

---

## 🎉 **INTEGRATION SUCCESS EXAMPLE**

**Google AI Studio Integration (December 2025)**:

- **Status**: ✅ 100% Complete following this checklist
- **Timeline**: 1 day for complete integration
- **Files Updated**: 25+ files across core, CLI, tests, docs, demos
- **Result**: 6th major AI provider with complete feature parity
- **Achievement**: Production-ready with comprehensive visual content

---

## 📝 **LESSONS LEARNED**

### **Critical Success Factors**

1. **Follow the Checklist**: Complete all 6 phases for production readiness
2. **File Naming Consistency**: Use established patterns for maintainability
3. **Authentication Flexibility**: Support multiple auth methods when possible
4. **Complete Testing**: Update all test files to prevent regressions
5. **Documentation First**: Update docs before considering integration complete

### **Common Pitfalls**

1. **Skipping Test Updates**: Always update all test files
2. **Incomplete CLI Integration**: Ensure all commands support new provider
3. **Missing Documentation**: Users can't use what isn't documented
4. **Factory Edge Cases**: Test auto-selection and error scenarios
5. **MCP Integration**: Don't forget to update all 10 MCP tool schemas

### **Best Practices**

1. **Provider Aliases**: Support multiple ways to reference providers
2. **Environment Variables**: Clear naming and comprehensive examples
3. **Error Messages**: Include provider name in error messages for debugging
4. **Visual Content**: Create comprehensive visual documentation
5. **Memory Bank Updates**: Document integration patterns for future use

---

**Created**: December 6, 2025
**Source**: Google AI Studio integration experience
**Maintainer**: NeuroLink Development Team
**Status**: Production-ready integration guide
