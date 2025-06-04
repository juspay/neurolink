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

## 🎬 Visual Documentation

✅ **COMPLETE VISUAL CONTENT ECOSYSTEM CREATED!**

### 📹 **5 Demo Videos Created** ✅
- **Real AI Generation**: 5,681+ tokens of actual AI content recorded
- **Professional Quality**: 1920x1080 WebM format videos
- **Complete Coverage**: All feature categories demonstrated
- **Automated Creation**: Playwright-based recording system
- **Files**: Located in `videos/` directory with organized folders

**Video Content**:
1. **Basic Examples**: AI generation + schema validation (529 tokens)
2. **Business Use Cases**: Email + analysis + summaries (1,677 tokens)
3. **Creative Tools**: Stories + translation + ideas (1,174 tokens)
4. **Developer Tools**: Code + documentation + debugging (2,301 tokens)
5. **Monitoring**: Live analytics and provider status

### 📸 **6 Professional Screenshots** ✅
- **High Resolution**: 1920x1080 professional captures
- **Real AI Content**: Actual generation results displayed
- **Organized Structure**: Categorized in `screenshots/` directory
- **Production Quality**: Suitable for documentation and marketing

**Screenshot Categories**:
1. **Main Interface Overview** - Dashboard and metrics
2. **Basic Examples** - AI text generation in action
3. **Business Use Cases** - Email generation, data analysis, summarization
4. **Creative Tools** - Story writing, translation, content ideas
5. **Developer Tools** - Code generation, API docs, debugging
6. **Monitoring** - Analytics and provider status

### 🎯 **"No Installation Required" Achievement**
Users can now experience NeuroLink through:
- **📸 View Screenshots**: Immediate visual reference
- **🎬 Watch Videos**: Complete feature demonstrations
- **💻 Run Live Demo**: Hands-on interactive experience
- **📚 Read Documentation**: Setup and integration guides


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
