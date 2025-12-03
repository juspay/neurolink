# NeuroLink Example Scripts

## 🚀 Quick Start

### 1. No API Keys Required
```bash
node demo-without-keys.js
```
**Shows**: Expected structure and behavior with mock data

### 2. Robust Testing (Handles Missing Keys)
```bash
node simple-test-robust.js
```
**Shows**: Graceful fallback when API keys are missing

### 3. Full Testing (Requires API Keys)
```bash
node simple-test.js
```

---

## 🆕 **Enterprise Configuration Examples (New v3.0)**

### Configuration Management
```bash
# Basic configuration setup with automatic backups
node ../examples/config-management/basic-config-setup.js

# Backup and restore demonstration
node ../examples/config-management/backup-restore-demo.js
```

**Features Demonstrated**:
- ✅ Automatic backup creation before config changes
- ✅ Config validation with suggestions and warnings
- ✅ Provider management and status monitoring
- ✅ Error recovery with auto-restore
- ✅ Hash verification and integrity checking

### Interface Usage Examples
```bash
# Rich ExecutionContext with 15+ fields
node ../examples/interface-usage/execution-context-example.js
```

**Features Demonstrated**:
- ✅ Rich context flow throughout operations
- ✅ Performance optimization with caching
- ✅ Fallback providers and error recovery
- ✅ Security permissions and access control
- ✅ Monitoring and debugging capabilities

---

## 📁 **Example Categories**

### **Legacy Examples** (scripts/examples/)
- `simple-test.js` - Basic AI provider testing
- `simple-test-robust.js` - Graceful error handling
- `demo-without-keys.js` - Mock data demonstrations
- `real-world-demo.js` - Production-like scenarios

### **🆕 Configuration Management** (examples/config-management/)
- `basic-config-setup.js` - Enterprise config initialization
- `backup-restore-demo.js` - Backup/restore workflows
- `provider-management.js` - Provider configuration
- `validation-examples.js` - Config validation demos
- `error-recovery-demo.js` - Error recovery patterns

### **🆕 Interface Usage** (examples/interface-usage/)
- `execution-context-example.js` - Rich context demonstration
- `registry-interface-demo.js` - Registry patterns
- `toolIntegration-example.js` - Tool integration
- `migration-examples.js` - Legacy to v3.0 migration

---

## 🎯 **Usage Recommendations**

### **For New Users**
1. Start with `demo-without-keys.js` to understand structure
2. Try `simple-test-robust.js` for error handling patterns
3. Explore `basic-config-setup.js` for enterprise features

### **For Enterprise Users**
1. Review `basic-config-setup.js` for configuration management
2. Study `execution-context-example.js` for rich context usage
3. Implement `backup-restore-demo.js` patterns for production

### **For Developers**
1. Examine interface usage examples for implementation patterns
2. Use configuration examples for system integration
3. Reference migration examples for legacy code updates
**Shows**: Real API integration with analytics and evaluation

## 📋 Setup for Real API Calls

Create `.env` file in project root:
```bash
# Google AI Studio (Recommended)
GOOGLE_AI_API_KEY=your_google_ai_key_here

# Alternative: OpenAI
OPENAI_API_KEY=your_openai_key_here

# Alternative: Anthropic
ANTHROPIC_API_KEY=your_anthropic_key_here
```

## 🎯 Expected Results

### With API Keys:
```javascript
{
  text: "AI response here...",
  analytics: {
    provider: "google-ai",
    model: "gemini-2.5-pro",
    tokens: { input: 12, output: 45, total: 57 },
    cost: 0.00034,
    responseTime: 1850,
    context: { demo: "test" }
  },
  evaluation: {
    relevance: 9,
    accuracy: 8,
    completeness: 9,
    overall: 8.7
  }
}
```

### Without API Keys:
- Scripts detect missing keys
- Show helpful setup instructions
- Gracefully exit with guidance

## 📊 Scripts Overview

| Script | Purpose | API Keys | Status |
|--------|---------|----------|--------|
| `demo-without-keys.js` | Mock demonstration | ❌ Not needed | ✅ Always works |
| `simple-test-robust.js` | Graceful testing | ⚠️ Optional | ✅ Always works |
| `simple-test.js` | Real API testing | ✅ Required | ✅ Works with keys |
| `simple-analytics-test.js` | Analytics focus | ✅ Required | ✅ Works with keys |
| `quick-eval-test.js` | Evaluation focus | ✅ Required | ✅ Works with keys |
| `real-world-demo.js` | Production demo | ✅ Required | ✅ Works with keys |

## 🔧 Troubleshooting

### Import Errors
- ✅ **Fixed**: All scripts use correct relative paths
- ✅ **Fixed**: Import from built distribution (`../../dist/lib/neurolink.js`)

### Missing API Keys
- ✅ **Expected**: Scripts detect and report missing keys
- ✅ **Guidance**: Clear setup instructions provided
- ✅ **Fallback**: Use `demo-without-keys.js` for testing structure

### Build Issues
- ✅ **Verified**: Run `pnpm run build` first
- ✅ **Confirmed**: All TypeScript compilation successful

## ✅ Verification

All scripts now work correctly:
1. **Import paths**: Fixed and verified
2. **Error handling**: Graceful fallback for missing API keys
3. **Documentation**: Clear setup instructions
4. **Mock demo**: Works without any setup
5. **Real testing**: Works with proper API keys

**Result**: Professional example scripts ready for distribution! 🎉
