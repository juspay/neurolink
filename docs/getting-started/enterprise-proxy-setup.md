# 🏢 Enterprise & Proxy Setup Guide

NeuroLink routes supported HTTP request paths through configured proxies. Native AWS requests, Google authentication and Live WebSockets have separate transport rules described below.

## ✨ Configure HTTP Proxy Routes

Set the proxy environment variables before creating clients. Request paths that use NeuroLink's proxy-aware HTTP fetch read these settings; they do not establish proxy routing for every SDK or WebSocket transport.

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

### Transport Coverage and Limits

| Transport                                                         | Integration                                   | Coverage limit                                                                                                                                              |
| ----------------------------------------------------------------- | --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Google AI Studio / Vertex `@google/genai` model HTTP              | SDK HTTP fetch hook                           | The owned HTTP proxy suite covers AI Studio, Vertex Express and the direct web-search tool; it excludes ADC token requests and Live WebSockets.             |
| Other fetch-backed model requests                                 | Provider-specific proxy-aware fetch           | Check the actual provider request path; a configured variable or successful response alone is not routing proof.                                            |
| Native AWS SDK clients, including Bedrock runtime/control clients | AWS request handler and runtime configuration | Current native Bedrock constructors do not inject NeuroLink's proxy handler. Handler/agent/runtime behavior and bypass semantics need separate route tests. |
| Gemini Live WebSockets                                            | `ws` or the GenAI Live SDK transport          | Outside the HTTP fetch hook. WebSocket agents and Node runtime settings can affect routing independently.                                                   |
| Vertex ADC token acquisition/refresh                              | `google-auth-library` / `gaxios`              | Outside the model fetch hook. The dependency may honor proxy variables independently; its token-refresh and bypass behavior must be checked separately.     |

`NO_PROXY` syntax is documented in the [Environment Variables guide](environment-variables.md). Those shared HTTP matching rules do not automatically apply to the other transports. Missing custom integration does not mean a dependency or runtime can never proxy: observe the route in the environment you use.

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

- ✅ The intended inference request appears in the proxy logs; a successful response alone does not prove routing
- ✅ Proxy server logs showing intercepted connections
- ✅ Proxy/bypass controls confirm the expected direct or proxied route for each transport
- ✅ Enterprise MCP tools work alongside proxy

### Owned HTTP Routing Tests

After building the package, run the current credential-free Google HTTP proxy suite:

```bash
pnpm run test:google-genai-proxy
```

It uses owned forward/direct stand-ins and request counters, with proxy-only response markers and proxy/bypass controls. Its source records the exact covered public paths. It does not certify all providers, native AWS routing, Gemini Live WebSockets or ADC token refresh. Test those transports separately with owned endpoints before relying on them in a constrained network.

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
// - Other provider-specific HTTP fetch paths
// Native AWS handlers, ADC token refresh and Live WebSockets are separate.
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
- [CLI Guide](../cli-guide.md) - Command line proxy usage
- [Environment Variables](environment-variables.md) - Complete variable reference
- [Troubleshooting](../troubleshooting.md) - Common issues and solutions

---

**Enterprise Support**: For enterprise deployment assistance, contact [enterprise@juspay.in](mailto:enterprise@juspay.in)
