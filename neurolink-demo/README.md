# NeuroLink AI Toolkit - Interactive Demo

🧠 **Complete working demo showcasing the NeuroLink SDK with real AI integrations**

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd neurolink-demo
npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env` and add your API keys:

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
# OpenAI Configuration (Recommended - most reliable)
OPENAI_API_KEY=sk-your-openai-key-here
OPENAI_MODEL=gpt-4

# AWS Bedrock Configuration
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_SESSION_TOKEN=your-session-token  # If using temporary credentials
AWS_REGION=us-east-2
BEDROCK_MODEL=arn:aws:bedrock:us-east-2:225681119357:inference-profile/us.anthropic.claude-3-7-sonnet-20250219-v1:0

# Google Vertex AI Configuration (choose one authentication method)
GOOGLE_VERTEX_PROJECT=your_project_id
GOOGLE_VERTEX_LOCATION=us-east5

# Method 1: Service Account File (Recommended for Production)
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json

# Method 2: Service Account JSON String (Good for Containers/Cloud)
# GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"your-project",...}

# Method 3: Individual Environment Variables (Good for CI/CD)
# GOOGLE_AUTH_CLIENT_EMAIL=service-account@project.iam.gserviceaccount.com
# GOOGLE_AUTH_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----"

# Demo Configuration
PORT=3000
DEFAULT_PROVIDER=openai
ENABLE_STREAMING=true
ENABLE_FALLBACK=true
```

### 3. Start the Demo Server
```bash
npm start
```

### 4. Open Demo Interface
Visit **http://localhost:3000** in your browser

## 🎯 What You'll See

### Interactive Web Interface
- **🚀 Basic Examples**: Provider testing, schema validation, performance benchmarks
- **💼 Business Use Cases**: Email generation, data analysis, document summarization
- **🎨 Creative Tools**: Creative writing, translation, content ideas
- **👨‍💻 Developer Tools**: Code generation, API documentation, debug analysis
- **📊 Monitoring**: Usage analytics and provider status

### Real AI Integration
- Live text generation with multiple AI providers
- Auto-selection of best available provider
- Real-time performance metrics
- Structured data generation with schema validation
- Interactive examples across business and creative domains

## 📋 Available API Endpoints

### Core Endpoints
- `GET /` - Interactive demo web interface
- `GET /api/status` - Provider configuration and health check
- `POST /api/generate` - Text generation with provider selection
- `POST /api/schema` - Structured data generation with validation
- `POST /api/benchmark` - Performance comparison across providers

### Business Use Cases
- `POST /api/business/email` - Professional email generation
- `POST /api/business/analyze-data` - CSV data analysis and insights
- `POST /api/business/summarize` - Document summarization

### Creative Tools
- `POST /api/creative/writing` - Creative content generation
- `POST /api/creative/translate` - Multi-language translation
- `POST /api/creative/ideas` - Content ideation for various formats

### Developer Tools
- `POST /api/developer/code` - Code generation across languages
- `POST /api/developer/api-doc` - API documentation generation
- `POST /api/developer/debug` - Error analysis and debugging help

### Analytics
- `GET /api/analytics` - Usage statistics and performance metrics

## 🖥️ CLI Integration Examples

### Using the NeuroLink CLI with Demo Server
```bash
# Start the demo server in one terminal
npm start

# In another terminal, use the CLI to interact with the same providers:

# Basic text generation using CLI
npx @juspay/neurolink generate-text "Write a haiku about programming"

# Compare with server API
curl -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Write a haiku about programming", "provider": "auto"}'

# Check provider status with CLI
npx @juspay/neurolink status --verbose

# Batch process multiple prompts with CLI
echo -e "Explain AI\nWrite a poem\nGenerate code" > prompts.txt
npx @juspay/neurolink batch prompts.txt --output cli-results.json

# Stream real-time generation
npx @juspay/neurolink stream "Tell me a story about robots"
```

### CLI vs API Comparison
```bash
# CLI approach (simple, scriptable)
npx @juspay/neurolink generate-text "Hello world" --format json

# API approach (programmatic integration)
curl -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Hello world", "provider": "auto"}'
```

## 🧪 Testing with curl

### Basic Text Generation
```bash
curl -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Write a haiku about artificial intelligence", "provider": "auto"}'
```

### Schema Validation
```bash
curl -X POST http://localhost:3000/api/schema \
  -H "Content-Type: application/json" \
  -d '{"type": "user-profile"}'
```

### Business Email Generation
```bash
curl -X POST http://localhost:3000/api/business/email \
  -H "Content-Type: application/json" \
  -d '{"type": "marketing", "context": "New AI product launch"}'
```

### Performance Benchmark
```bash
curl -X POST http://localhost:3000/api/benchmark \
  -H "Content-Type: application/json" \
  -d '{}'
```

### Provider Status Check
```bash
curl http://localhost:3000/api/status
```

## 🎬 Complete Visual Documentation Ecosystem

### 🌐 **Web Demo Visual Content** ✅

#### **📸 Interactive Web Interface Screenshots**
| Feature | Screenshot | Description |
|---------|------------|-------------|
| **Main Interface** | ![Main Interface](./screenshots/01-overview/01-main-interface-overview-2025-06-04T13-56-43-628Z.png) | Complete web interface dashboard |
| **AI Generation Results** | ![AI Generation](./screenshots/02-basic-examples/02-ai-generation-results-2025-06-04T13-57-13-156Z.png) | Real AI content generation in action |
| **Business Use Cases** | ![Business Cases](./screenshots/03-business-use-cases/03-business-use-cases-2025-06-04T13-59-07-846Z.png) | Professional business applications |
| **Creative Tools** | ![Creative Tools](./screenshots/04-creative-tools/04-creative-tools-2025-06-04T13-59-24-346Z.png) | Creative content generation |
| **Developer Tools** | ![Developer Tools](./screenshots/05-developer-tools/05-developer-tools-2025-06-04T13-59-43-322Z.png) | Code generation and API docs |
| **Analytics & Monitoring** | ![Monitoring](./screenshots/06-monitoring/06-monitoring-analytics-2025-06-04T14-00-08-919Z.png) | Real-time provider analytics |

#### **🎥 Demo Videos** *(5,681+ tokens of real AI generation)*
- **[Basic Examples](./videos/basic-examples/)** - Text generation, haiku creation, storytelling (529 tokens)
- **[Business Use Cases](./videos/business-use-cases/)** - Email generation, analysis, summaries (1,677 tokens)
- **[Creative Tools](./videos/creative-tools/)** - Stories, translation, creative ideas (1,174 tokens)
- **[Developer Tools](./videos/developer-tools/)** - React code, API docs, debugging help (2,301 tokens)
- **[Monitoring & Analytics](./videos/monitoring/)** - Live provider status and performance

### 🖥️ **CLI Integration Visual Content** ✅

#### **📸 Professional CLI Screenshots**
| Command | Screenshot | Description |
|---------|------------|-------------|
| **CLI Help Overview** | ![CLI Help](../cli-screenshots/01-cli-help-2025-06-04T19-38-12.png) | Complete command reference |
| **Provider Status** | ![Provider Status](../cli-screenshots/02-provider-status-2025-06-04T19-38-25.png) | All provider connectivity verified |
| **Text Generation** | ![Text Generation](../cli-screenshots/03-text-generation-2025-06-04T19-38-30.png) | Real AI haiku generation with JSON |
| **Auto Provider Selection** | ![Best Provider](../cli-screenshots/04-best-provider-2025-06-04T19-38-33.png) | Automatic provider selection working |
| **Batch Processing** | ![Batch Results](../cli-screenshots/05-batch-results-2025-06-04T19-38-37.png) | Multi-prompt processing with results |

#### **🎥 CLI Demonstration Videos** *(Real command execution)*
- **[CLI Overview](../cli-videos/cli-overview/)** - Help, status, provider selection commands
- **[Basic Generation](../cli-videos/cli-basic-generation/)** - Text generation with different providers
- **[Batch Processing](../cli-videos/cli-batch-processing/)** - File-based multi-prompt processing
- **[Real-time Streaming](../cli-videos/cli-streaming/)** - Live AI content streaming
- **[Advanced Features](../cli-videos/cli-advanced-features/)** - Verbose diagnostics and provider options

### 🎯 **Complete Visual Ecosystem Benefits**
- ✅ **No Installation Required** - See everything in action before installing
- ✅ **Real AI Content** - All screenshots and videos show actual AI generation
- ✅ **Professional Quality** - 1920x1080 resolution suitable for documentation
- ✅ **Complete Coverage** - Every major feature visually documented
- ✅ **CLI + Web Integration** - Both interfaces comprehensively documented
- ✅ **Production Validation** - Demonstrates real-world usage patterns

### 📊 **Visual Content Metrics**
- **📸 Total Screenshots**: 11 professional captures (Web: 6, CLI: 5)
- **🎥 Total Videos**: 10 demonstration videos (Web: 5, CLI: 5)
- **🤖 AI Content Generated**: 5,681+ tokens during video creation
- **📁 Organization**: Structured folders with descriptive names
- **🎨 Quality**: Professional 1920x1080 resolution throughout


## 🧪 Testing Guide

### Overview of Test Categories

#### 1. Provider Configuration Tests
**Purpose**: Verify all providers are properly configured
```bash
npm run test:config
```

#### 2. API Integration Tests
**Purpose**: Test actual API calls with real credentials
```bash
npm run test:api
```

#### 3. Fallback Mechanism Tests
**Purpose**: Verify automatic provider fallback
```bash
npm run test:fallback
```

#### 4. Performance Benchmark Tests
**Purpose**: Compare response times across providers
```bash
npm run test:performance
```

#### 5. Streaming Tests
**Purpose**: Test real-time streaming capabilities
```bash
npm run test:streaming
```

### Comprehensive Test Suite

#### Run All Tests
```bash
npm test
```

#### Individual Test Categories
```bash
# Configuration validation
npm run test:config

# API functionality
npm run test:api

# Error handling
npm run test:errors

# Performance metrics
npm run test:performance

# Web interface
npm run test:web
```

### Test Case Descriptions

#### 1. Provider Configuration Tests
- ✅ Environment variable validation
- ✅ API credential verification
- ✅ Provider initialization
- ✅ Authentication method detection

#### 2. API Integration Tests
- ✅ Text generation with real prompts
- ✅ Response format validation
- ✅ Usage statistics verification
- ✅ Model-specific parameter testing

#### 3. Error Handling Tests
- ✅ Invalid credential handling
- ✅ Network timeout scenarios
- ✅ Rate limiting responses
- ✅ Malformed request handling

#### 4. Streaming Tests
- ✅ Real-time text streaming
- ✅ Stream interruption handling
- ✅ Chunk assembly verification
- ✅ Connection stability testing

#### 5. Performance Tests
- ✅ Response time measurement
- ✅ Provider comparison metrics
- ✅ Concurrent request handling
- ✅ Memory usage monitoring

### Custom Test Scenarios

#### Test with Specific Provider
```bash
# Test OpenAI only
PROVIDER=openai npm test

# Test Bedrock only
PROVIDER=bedrock npm test

# Test Vertex AI only
PROVIDER=vertex npm test
```

#### Test with Custom Prompts
```bash
# Test with long prompts
PROMPT_TYPE=long npm test

# Test with complex prompts
PROMPT_TYPE=complex npm test

# Test with multilingual prompts
PROMPT_TYPE=multilingual npm test
```

## 📡 API Documentation

### Base URL
```
http://localhost:3000
```

### Endpoints

#### GET `/`
**Description**: Interactive web interface
**Response**: HTML demo page

#### GET `/api/status`
**Description**: Provider status and configuration
**Response**:
```json
{
  "timestamp": "2025-06-04T10:17:00Z",
  "providers": {
    "openai": {
      "available": true,
      "model": "gpt-4o",
      "configured": true
    },
    "bedrock": {
      "available": true,
      "model": "anthropic.claude-3-sonnet-20240229-v1:0",
      "configured": true
    },
    "vertex": {
      "available": true,
      "model": "gemini-1.5-pro",
      "configured": true
    }
  },
  "bestProvider": "bedrock"
}
```

#### POST `/api/generate`
**Description**: Generate text using specified provider
**Request**:
```json
{
  "provider": "openai|bedrock|vertex|auto",
  "prompt": "Your prompt here",
  "maxTokens": 500,
  "temperature": 0.7
}
```
**Response**:
```json
{
  "success": true,
  "content": "Generated text response",
  "provider": "openai",
  "model": "gpt-4o",
  "responseTime": 1250,
  "usage": {
    "promptTokens": 15,
    "completionTokens": 42,
    "totalTokens": 57
  }
}
```

#### POST `/api/stream`
**Description**: Stream text generation in real-time
**Request**: Same as `/api/generate`
**Response**: Server-sent events stream

#### POST `/api/test-fallback`
**Description**: Test automatic provider fallback
**Request**:
```json
{
  "prompt": "Test prompt for fallback"
}
```
**Response**:
```json
{
  "timestamp": "2025-06-04T10:17:00Z",
  "attempts": [
    {"provider": "openai", "status": "failed", "error": "Rate limit exceeded"},
    {"provider": "bedrock", "status": "success", "responseTime": 890}
  ],
  "success": true,
  "finalResult": {
    "provider": "bedrock",
    "content": "Generated content"
  }
}
```

#### POST `/api/benchmark`
**Description**: Performance comparison across providers
**Response**:
```json
{
  "timestamp": "2025-06-04T10:17:00Z",
  "results": {
    "openai": {
      "success": true,
      "responseTime": 1200,
      "model": "gpt-4o",
      "contentLength": 156
    },
    "bedrock": {
      "success": true,
      "responseTime": 890,
      "model": "anthropic.claude-3-sonnet-20240229-v1:0",
      "contentLength": 142
    },
    "vertex": {
      "success": false,
      "error": "Authentication failed"
    }
  }
}
```

#### POST `/api/schema`
**Description**: Test structured output generation
**Response**:
```json
{
  "success": true,
  "structuredData": {
    "name": "Alice Johnson",
    "age": 28,
    "occupation": "Software Engineer",
    "hobbies": ["reading", "hiking", "photography"]
  },
  "provider": "auto-selected"
}
```

## 🔧 Troubleshooting

### Provider Configuration Issues

#### OpenAI Setup
- Ensure valid API key from https://platform.openai.com/api-keys
- Check account has credits and access to GPT-4
- Verify no rate limiting or usage restrictions

#### AWS Bedrock Setup
- Configure AWS credentials with Bedrock access
- Ensure account has Claude model permissions
- Use full inference profile ARN format for Anthropic models
- Check AWS region configuration matches model availability

#### Google Vertex AI Setup
- Enable Vertex AI API in Google Cloud Console
- Configure service account with appropriate permissions
- Ensure project billing is enabled
- Verify model access in your region

### Common Error Messages

**"Provider not available"**
- Check API key configuration
- Verify internet connectivity
- Confirm account permissions

**"Invalid model specified"**
- Use correct model names for each provider
- Check model availability in your region
- Verify account access to specific models

**"Auto-selection failed"**
- Ensure at least one provider is properly configured
- Check provider priority order in configuration
- Verify fallback mechanisms are enabled

### Performance Issues

**Slow Response Times**
- Check network connectivity
- Verify provider region settings
- Consider switching to faster providers for testing

**High Token Usage**
- Adjust maxTokens parameters
- Use more specific prompts
- Implement response caching for repeated requests

## 📊 Demo Statistics Tracking

The demo includes built-in analytics tracking:

- **Request Counts**: Total API calls made
- **Token Usage**: Cumulative token consumption
- **Provider Performance**: Response times and success rates
- **Error Tracking**: Failed requests and error patterns
- **Usage Patterns**: Most popular endpoints and features

## 🎯 Production Considerations

This demo showcases production-ready patterns:

### Security
- Environment variable configuration
- Error handling and validation
- Rate limiting considerations
- API key management

### Performance
- Provider fallback mechanisms
- Response caching strategies
- Optimal model selection
- Token usage optimization

### Monitoring
- Usage analytics and reporting
- Provider health checking
- Error logging and alerting
- Performance metrics tracking

## 🌟 Key Features Demonstrated

### 1. **Multi-Provider Support**
- OpenAI GPT-4 integration
- Amazon Bedrock Claude models
- Google Vertex AI Gemini models
- Intelligent auto-selection

### 2. **Comprehensive Use Cases**
- Business applications (emails, data analysis, summarization)
- Creative tools (writing, translation, ideation)
- Developer utilities (code generation, documentation, debugging)
- Advanced features (schema validation, batch processing)

### 3. **Production-Ready Patterns**
- Robust error handling
- Performance monitoring
- Usage analytics
- Provider fallbacks

### 4. **Interactive Learning**
- Real-time AI generation
- Immediate feedback and results
- Performance comparisons
- Best practice examples

## 🚀 Next Steps

1. **Run the Demo**: Start the server and explore all features
2. **Test with Real APIs**: Configure your credentials and see live AI generation
3. **Examine Code Patterns**: Review server implementation for integration examples
4. **Record Visual Content**: Use for creating screenshots and video demonstrations
5. **Integrate SDK**: Apply patterns learned to your own projects

## 📞 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Verify your environment configuration
3. Test individual providers using the status endpoint
4. Review console logs for detailed error information
5. Ensure all dependencies are properly installed

---

**🧠 NeuroLink SDK Demo** - Showcasing the power of unified AI provider integration with real-world use cases and production-ready patterns.
