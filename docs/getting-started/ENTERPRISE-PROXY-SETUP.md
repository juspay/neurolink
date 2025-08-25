# 🏢 Enterprise & Proxy Setup Guide

NeuroLink provides comprehensive proxy support for enterprise environments, enabling AI integration behind corporate firewalls and proxy servers.

## ✨ Zero Configuration Proxy Support

NeuroLink automatically detects and uses proxy settings when environment variables are configured. **No code changes required.**

### Quick Setup

```bash
# Set proxy environment variables
export HTTPS_PROXY=http://your-corporate-proxy:port
export HTTP_PROXY=http://your-corporate-proxy:port

# NeuroLink will automatically use these settings
npx @juspay/neurolink generate "Hello from behind corporate proxy"
```

## 🔧 Environment Variables

### Required Proxy Variables

| Variable      | Description                     | Example                         |
| ------------- | ------------------------------- | ------------------------------- |
| `HTTPS_PROXY` | Proxy server for HTTPS requests | `http://proxy.company.com:8080` |
| `HTTP_PROXY`  | Proxy server for HTTP requests  | `http://proxy.company.com:8080` |

### Optional Proxy Variables

| Variable   | Description             | Default               |
| ---------- | ----------------------- | --------------------- |
| `NO_PROXY` | Domains to bypass proxy | `localhost,127.0.0.1` |

## 🌐 Provider-Specific Proxy Support

### ✅ Full Proxy Support

All NeuroLink providers automatically work through corporate proxies:

| Provider             | Proxy Method                        | Status               |
| -------------------- | ----------------------------------- | -------------------- |
| **Anthropic Claude** | Direct fetch calls with proxy       | ✅ Verified + Tested |
| **OpenAI**           | Global fetch handling               | ✅ Verified + Tested |
| **Google Vertex AI** | Custom fetch with undici ProxyAgent | ✅ Verified + Tested |
| **Google AI Studio** | Custom fetch with undici ProxyAgent | ✅ Verified + Tested |
| **Mistral AI**       | Custom fetch with undici ProxyAgent | ✅ Verified + Tested |
| **Ollama**           | Custom fetch with undici ProxyAgent | ✅ Verified + Tested |
| **HuggingFace**      | Custom fetch with undici ProxyAgent | ✅ Implemented       |
| **Azure OpenAI**     | Custom fetch with undici ProxyAgent | ✅ Implemented       |
| **Amazon Bedrock**   | Global fetch handling               | ✅ Implemented       |

## 🚀 Quick Validation

### Test Proxy Configuration

```bash
# 1. Set proxy variables
export HTTPS_PROXY=http://your-proxy:port
export HTTP_PROXY=http://your-proxy:port

# 2. Test with any provider
npx @juspay/neurolink generate "Test proxy connection" --provider google-ai

# 3. Check proxy logs for connection intercepts
```

### Verify Proxy Usage

When proxy is working correctly, you should see:

- ✅ AI responses generated successfully
- ✅ Proxy server logs showing intercepted connections
- ✅ No direct internet access required
- ✅ Enterprise MCP tools work alongside proxy

### Enterprise Grade Testing

NeuroLink includes comprehensive proxy validation tests:

```bash
# Run enterprise proxy tests
npm test -- test/proxy/proxySupport.test.ts

# Test all providers with proxy + MCP
npm test -- test/proxy/proxySupport.test.ts --run
```

**Test Coverage:**

- ✅ Proxy usage validation (negative/positive testing)
- ✅ All enterprise providers (Anthropic, OpenAI, Vertex, Mistral, Ollama)
- ✅ MCP + Proxy compatibility (enterprise grade)
- ✅ Real-world timeout handling
- ✅ SDK and CLI interface testing

## 🔍 Enterprise Configuration Examples

### Corporate Firewall Setup

```bash
# Standard corporate proxy
export HTTPS_PROXY=http://proxy.company.com:8080
export HTTP_PROXY=http://proxy.company.com:8080
export NO_PROXY=localhost,127.0.0.1,.company.com
```

### Authenticated Proxy

```bash
# Proxy with authentication
export HTTPS_PROXY=http://username:password@proxy.company.com:8080
export HTTP_PROXY=http://username:password@proxy.company.com:8080
```

### Multiple Environment Setup

```bash
# Development environment
export HTTPS_PROXY=http://dev-proxy.company.com:8080

# Production environment
export HTTPS_PROXY=http://prod-proxy.company.com:8080
```

## 🛠️ Technical Implementation

### Architecture Overview

NeuroLink uses the **undici ProxyAgent** for reliable proxy support:

```typescript
// Automatic proxy detection and configuration
const proxyFetch = createProxyFetch();

// Provider integration varies by SDK capabilities:
// - Custom fetch parameter (Google AI, Vertex AI)
// - Direct fetch calls (Anthropic)
// - Global fetch handling (OpenAI, Bedrock)
```

### Key Benefits

- 🔄 **Automatic Detection** - Zero configuration for standard setups
- 🏢 **Enterprise Ready** - Works with corporate authentication
- ⚡ **High Performance** - Optimized undici implementation
- 🛡️ **Security Compliant** - Respects corporate security policies

## 🔧 Troubleshooting

### Common Issues

#### Proxy Not Working

```bash
# Check environment variables
echo $HTTPS_PROXY
echo $HTTP_PROXY

# Verify proxy server accessibility
curl -I --proxy $HTTPS_PROXY https://api.openai.com
```

#### Connection Timeouts

```bash
# Increase timeout for slow proxies
export NEUROLINK_TIMEOUT=60000  # 60 seconds
```

#### Authentication Issues

```bash
# URL encode special characters in credentials
# @ becomes %40, : becomes %3A
export HTTPS_PROXY=http://user%40domain.com:pass%3Aword@proxy:8080
```

### Debug Mode

```bash
# Enable detailed proxy logging
export DEBUG=neurolink:proxy
npx @juspay/neurolink generate "Debug proxy connection" --debug
```

## 🚀 AWS & Cloud Deployment

### AWS Corporate Environment

```bash
# Set in AWS Lambda environment variables
HTTPS_PROXY=http://corporate-proxy.amazonaws.com:8080
HTTP_PROXY=http://corporate-proxy.amazonaws.com:8080
```

### Docker Deployment

```dockerfile
# Dockerfile
ENV HTTPS_PROXY=http://proxy.company.com:8080
ENV HTTP_PROXY=http://proxy.company.com:8080
RUN npm install @juspay/neurolink
```

### Kubernetes Configuration

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
spec:
  template:
    spec:
      containers:
        - name: neurolink-app
          env:
            - name: HTTPS_PROXY
              value: "http://proxy.company.com:8080"
            - name: HTTP_PROXY
              value: "http://proxy.company.com:8080"
```

## 📋 Checklist for Enterprise Deployment

### Pre-deployment

- [ ] Proxy server details obtained from IT team
- [ ] Network connectivity tested with curl/wget
- [ ] Authentication credentials secured
- [ ] Firewall rules configured for AI provider domains

### Testing

- [ ] Environment variables set correctly
- [ ] NeuroLink proxy test successful
- [ ] All required providers accessible
- [ ] Production environment validated

### Security

- [ ] Proxy credentials stored securely
- [ ] NO_PROXY configured for internal services
- [ ] SSL/TLS verification enabled
- [ ] Logging configured appropriately

## 🔗 Related Documentation

- [Provider Configuration](provider-setup.md) - Detailed provider setup
- [CLI Guide](../CLI-GUIDE.md) - Command line proxy usage
- [Environment Variables](environment-variables.md) - Complete variable reference
- [Troubleshooting](../TROUBLESHOOTING.md) - Common issues and solutions

---

**Enterprise Support**: For enterprise deployment assistance, contact [enterprise@juspay.in](mailto:enterprise@juspay.in)
