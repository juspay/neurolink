# 🏢 Enterprise & Proxy Setup Guide

NeuroLink can send its outbound traffic through a corporate HTTP or HTTPS proxy, so it works behind firewalls that only allow egress through one.

## ✨ Configuration by Environment Variables

NeuroLink reads the standard proxy environment variables on every request. **No code changes are required.**

### Quick Setup

```bash
# Set proxy environment variables
export HTTPS_PROXY=http://your-corporate-proxy:port
export HTTP_PROXY=http://your-corporate-proxy:port

# NeuroLink uses them for its outbound requests
npx @juspay/neurolink generate "Hello from behind corporate proxy"
```

NeuroLink is a library, so it never installs a process-wide proxy for your application: only NeuroLink's own requests are routed. Your other code keeps whatever networking it already has.

## 🔧 Environment Variables

### Proxy Variables

| Variable      | Description                                                 | Example                         |
| ------------- | ----------------------------------------------------------- | ------------------------------- |
| `HTTPS_PROXY` | Proxy for `https://` destinations                           | `http://proxy.company.com:8080` |
| `HTTP_PROXY`  | Proxy for `http://` destinations                            | `http://proxy.company.com:8080` |
| `ALL_PROXY`   | Fallback for either scheme when the specific one is not set | `http://proxy.company.com:8080` |
| `NO_PROXY`    | Hosts that connect directly (see the pattern list below)    | `localhost,127.0.0.1,.corp`     |

Lowercase spellings (`https_proxy`, `no_proxy`, …) are read too. The proxy URL itself must be `http://` or `https://`.

`NO_PROXY` accepts a comma-separated list of exact host names, `.example.com` domain suffixes (which also match `example.com`), `host:port`, IPv4 CIDR ranges such as `10.0.0.0/8`, and `*` for everything. Nothing is bypassed by default: list `localhost` and `127.0.0.1` yourself if local endpoints (Ollama, LM Studio, a local MCP server) must stay direct.

### Proxy Failure Handling

| Variable                 | Description                                                                             | Default |
| ------------------------ | --------------------------------------------------------------------------------------- | ------- |
| `NEUROLINK_PROXY_STRICT` | `true` makes a request whose proxy attempt failed fail, instead of retrying it directly | unset   |

By default, when a request cannot go through the proxy (the proxy refuses the connection, is unreachable, or is configured with an unsupported URL), NeuroLink logs a warning naming the destination host and retries the request **over a direct connection that bypasses the proxy**. That keeps existing setups working, but on a network where egress is allowed only through the proxy it means a broken proxy is silently worked around wherever a direct route happens to exist.

Set `NEUROLINK_PROXY_STRICT=true` (`1`, `yes` and `on` also work) to fail closed: the request fails with the proxy error and no direct connection is attempted. Downloads of provider-returned media URLs (`safeDownload`) and the `neurolink proxy` server's Claude and Codex upstream requests always fail closed, whatever this variable says.

### SOCKS Proxies Are Not Supported

`SOCKS_PROXY` and `socks4://` / `socks5://` URLs in `ALL_PROXY` are recognized but cannot be used: no SOCKS client ships with the package. Such a request falls back to a direct connection with a warning, or fails under `NEUROLINK_PROXY_STRICT`. Use an HTTP(S) proxy, or an HTTP-to-SOCKS bridge in front of the SOCKS proxy.

## 🌐 What Goes Through the Proxy

### Providers and Features Routed Through the Proxy

| Area                                                                          | How the proxy is applied                                                                                                                                  |
| ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **OpenAI**, **Anthropic** (direct API)                                        | The provider SDK is given NeuroLink's proxy-aware fetch                                                                                                   |
| **Google AI Studio**, **Google Vertex AI**                                    | `@google/genai` `httpOptions.fetch` for Gemini; the Anthropic Vertex SDK for Claude                                                                       |
| **Amazon Bedrock**, **Amazon SageMaker**                                      | The AWS SDK clients get a proxy-aware request handler                                                                                                     |
| OpenAI-compatible providers                                                   | Azure OpenAI, Mistral, DeepSeek, NVIDIA NIM, LM Studio, llama.cpp, the catalog providers and the other OpenAI-wire providers share one proxy-aware client |
| LiteLLM, OpenRouter, Ollama, Cohere                                           | Proxy-aware fetch                                                                                                                                         |
| Embeddings (Voyage, Jina) and image generation (Stability, Ideogram, Recraft) | Proxy-aware fetch                                                                                                                                         |
| `decide` providers (TypeSafe, Laya, XOR, Perplexity, Cloudflare Clef)         | Proxy-aware fetch                                                                                                                                         |
| Voice: TTS and STT                                                            | ElevenLabs, OpenAI, Azure, Deepgram, Google STT, Cartesia, Fish Audio, 60db                                                                               |
| Music and video                                                               | ElevenLabs Music, Lyria, Kling, Runway; HeyGen avatars                                                                                                    |
| Provider-returned media downloads                                             | `safeDownload` goes through the proxy and refuses a direct fallback                                                                                       |
| MCP                                                                           | The Streamable HTTP and SSE transports, and their OAuth token requests                                                                                    |
| Subscription logins                                                           | Claude and Codex OAuth token refresh, exchange, validation and revocation                                                                                 |
| Observability exporters (HTTP API)                                            | Langfuse, LangSmith, Datadog, Arize, Braintrust, Laminar, PostHog, OTLP HTTP exporter classes                                                             |
| `neurolink proxy` server upstreams                                            | `api.anthropic.com`, `chatgpt.com` (Codex) and the account quota endpoints                                                                                |

### Not Routed Through the Proxy

These still connect directly, whatever the proxy variables say:

- **WebSockets**: Gemini Live, OpenAI Realtime, LiveKit voice sessions, and the MCP WebSocket transport.
- **Google Application Default Credentials**: the OAuth token requests `google-auth-library` makes for Vertex AI service accounts. Allow the Google token endpoints through your firewall, or supply an access token another way.
- **Remote model catalogs** loaded by URL (dynamic model configuration).
- **Peer-to-peer proxy sharing** (`neurolink proxy share` / peers), which talks to other NeuroLink proxies, usually on a private network.
- **Local endpoint probes** such as the Ollama availability check on `localhost`.
- **OpenTelemetry trace export** through NeuroLink's `TracerProvider` (the OTLP trace exporter and the Langfuse span processor), which sends with Node's own HTTP client.
- The browser client SDK (`@juspay/neurolink/client`), which uses the browser's own networking and proxy settings.

The `neurolink proxy` server honours `HTTPS_PROXY` for its upstream calls too. Its Claude (`/v1/messages`) and Codex upstream requests never fall back to a direct connection: a proxy failure fails the attempt, and the server's normal account retry and failover handle it. Its account quota polling follows the default rules above.

## 🚀 Quick Validation

### Test Proxy Configuration

```bash
# 1. Set proxy variables
export HTTPS_PROXY=http://your-proxy:port
export HTTP_PROXY=http://your-proxy:port

# 2. Fail instead of silently going direct, so a misconfiguration shows
export NEUROLINK_PROXY_STRICT=true

# 3. Test with any provider
npx @juspay/neurolink generate "Test proxy connection" --provider google-ai

# 4. Check proxy logs for connection intercepts
```

### Verify Proxy Usage

When the proxy is working correctly, you should see:

- ✅ AI responses generated successfully
- ✅ Proxy server logs showing the CONNECT tunnels to provider hosts
- ✅ No `[Proxy Fetch] Request to … through the proxy failed` warnings in NeuroLink's log

### Automated Coverage

The repository's `test:proxy-egress` suite drives a local forward proxy and checks that a sample of call sites (ElevenLabs TTS and STT, ElevenLabs Music, the MCP HTTP transport, a Codex OAuth refresh, the proxy server's Codex upstream and a multipart image request) go through it, that `NO_PROXY` keeps listed hosts direct, that strict mode fails closed and that SOCKS is refused. `test:google-genai-proxy` covers the Google GenAI SDK path.

```bash
pnpm run build
pnpm run test:proxy-egress
```

## 🔍 Enterprise Configuration Examples

### Corporate Firewall Setup

```bash
# Standard corporate proxy
export HTTPS_PROXY=http://proxy.company.com:8080
export HTTP_PROXY=http://proxy.company.com:8080
export NO_PROXY=localhost,127.0.0.1,.company.com
# Egress is proxy-only: never fall back to a direct connection
export NEUROLINK_PROXY_STRICT=true
```

### Authenticated Proxy

```bash
# Proxy with authentication
export HTTPS_PROXY=http://username:password@proxy.company.com:8080
export HTTP_PROXY=http://username:password@proxy.company.com:8080
```

Credentials in a proxy URL are masked in NeuroLink's logs.

### Multiple Environment Setup

```bash
# Development environment
export HTTPS_PROXY=http://dev-proxy.company.com:8080

# Production environment
export HTTPS_PROXY=http://prod-proxy.company.com:8080
```

## 🛠️ Technical Implementation

### Architecture Overview

NeuroLink routes requests with undici's `ProxyAgent`, one per proxy URL, shared by every request:

```typescript
// Provider SDKs that accept a custom fetch get one that knows about the proxy
const proxyFetch = createProxyFetch();

// Plain outbound calls (voice, media, OAuth, MCP, exporters) use a drop-in
// for global fetch: identical to fetch when no proxy applies to the URL,
// and routed through the proxy's dispatcher when one does.
const response = await proxyAwareFetch(url, init);
```

Both read the environment on every request, honour `NO_PROXY`, and apply the same fallback rules (`NEUROLINK_PROXY_STRICT`). With no proxy variable set, requests are sent exactly as before.

### Key Benefits

- 🔄 **Environment Driven** - Standard proxy variables, no code changes
- 🏢 **Enterprise Ready** - Authenticated proxies and `NO_PROXY` patterns, including CIDR ranges
- 🛡️ **Fail-Closed Option** - `NEUROLINK_PROXY_STRICT` for proxy-only egress policies
- 📚 **Library Safe** - No global dispatcher is installed in your process

## 🔧 Troubleshooting

### Common Issues

#### Proxy Not Working

```bash
# Check environment variables
echo $HTTPS_PROXY
echo $HTTP_PROXY
echo $NO_PROXY

# Verify proxy server accessibility
curl -I --proxy $HTTPS_PROXY https://api.openai.com
```

If requests succeed but your proxy shows no traffic for them, check whether the destination is in the "Not routed through the proxy" list above, or whether `NO_PROXY` matches it.

#### Requests Bypassing the Proxy

A warning like `[Proxy Fetch] Request to api.example.com through the proxy failed (…); falling back to a direct connection` means the proxy rejected or could not carry the request and NeuroLink went direct. Fix the proxy error it names, and set `NEUROLINK_PROXY_STRICT=true` if direct egress must never be attempted.

#### Authentication Issues

```bash
# URL encode special characters in credentials
# @ becomes %40, : becomes %3A
export HTTPS_PROXY=http://user%40domain.com:pass%3Aword@proxy:8080
```

### Debug Mode

```bash
# Enable debug logging
NEUROLINK_DEBUG=true npx @juspay/neurolink generate "Debug proxy connection" --debug
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
ENV NO_PROXY=localhost,127.0.0.1
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
            - name: NO_PROXY
              value: "localhost,127.0.0.1,.svc.cluster.local"
            - name: NEUROLINK_PROXY_STRICT
              value: "true"
```

## 📋 Checklist for Enterprise Deployment

### Pre-deployment

- [ ] Proxy server details obtained from IT team
- [ ] Network connectivity tested with curl/wget
- [ ] Authentication credentials secured
- [ ] Firewall rules configured for AI provider domains
- [ ] Direct egress allowed for anything in "Not routed through the proxy" that you use

### Testing

- [ ] Environment variables set correctly
- [ ] NeuroLink proxy test successful with `NEUROLINK_PROXY_STRICT=true`
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
