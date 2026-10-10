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

Set `NEUROLINK_PROXY_STRICT=true` (`1`, `yes` and `on` also work) to fail closed: the request fails with the proxy error and no direct connection is attempted. The variable covers every request NeuroLink sends through its own proxy-aware fetch (the provider SDK clients and the voice, media, OAuth, MCP and exporter call sites below). These never fall back, whatever the variable says:

- downloads of provider-returned media URLs (`safeDownload`);
- the `neurolink proxy` server's Claude, Codex and Vertex upstream requests;
- the Amazon Bedrock and SageMaker clients, whose proxy-aware handler fails the request when the proxy cannot carry it. The one exception is a proxy URL it cannot use (a SOCKS or unparsable URL): the handler logs a warning and the client connects directly, strict mode or not.

### SOCKS Proxies Are Not Supported

`SOCKS_PROXY` and `socks4://` / `socks5://` URLs in `ALL_PROXY` are recognized but cannot be used: no SOCKS client ships with the package. Such a request falls back to a direct connection with a warning, or fails under `NEUROLINK_PROXY_STRICT`. Use an HTTP(S) proxy, or an HTTP-to-SOCKS bridge in front of the SOCKS proxy.

## 🌐 What Goes Through the Proxy

### Providers and Features Routed Through the Proxy

| Area                                                                          | How the proxy is applied                                                                                                                                                                                            |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **OpenAI**, **Anthropic** (direct API)                                        | The provider SDK is given NeuroLink's proxy-aware fetch; so is the Anthropic OAuth token refresh the provider performs                                                                                              |
| **Google AI Studio**, **Google Vertex AI** (Gemini)                           | `@google/genai` `httpOptions.fetch`; Vertex's REST image generation and inline image-URL downloads are proxy-aware too                                                                                              |
| **Google Vertex AI** (Claude)                                                 | The Anthropic Vertex SDK is given the proxy-aware fetch                                                                                                                                                             |
| **Amazon Bedrock**, **Amazon SageMaker**                                      | The Bedrock runtime and control-plane clients and the SageMaker runtime client get a proxy-aware request handler                                                                                                    |
| OpenAI-compatible providers                                                   | Azure OpenAI, Mistral, DeepSeek, NVIDIA NIM, LM Studio, llama.cpp, the catalog providers and the other OpenAI-wire providers share one proxy-aware client                                                           |
| LiteLLM, OpenRouter, Ollama, Cohere                                           | Proxy-aware fetch (the Ollama availability check included: list `localhost` in `NO_PROXY` to keep it direct)                                                                                                        |
| Embeddings (Voyage, Jina) and image generation (Stability, Ideogram, Recraft) | Proxy-aware fetch                                                                                                                                                                                                   |
| `decide` providers (TypeSafe, Laya, XOR, Perplexity, Cloudflare Clef)         | Proxy-aware fetch                                                                                                                                                                                                   |
| Voice: TTS and STT (request/response)                                         | ElevenLabs, OpenAI, Azure, Deepgram, Google STT, Cartesia, Fish Audio, 60db; the Whistle model downloads                                                                                                            |
| Music, video and avatars                                                      | ElevenLabs Music, Lyria, Kling, Runway, HeyGen                                                                                                                                                                      |
| Provider-returned media downloads                                             | `safeDownload` (Kling, Runway, HeyGen, D-ID, Replicate, Beatoven, Ideogram, Recraft, OpenAI, Google AI Studio) goes through the proxy and refuses a direct fallback                                                 |
| MCP                                                                           | The Streamable HTTP and SSE transports, and their OAuth token requests                                                                                                                                              |
| Subscription logins                                                           | Claude and Codex OAuth token refresh, exchange, validation and revocation, in the SDK and in `neurolink auth` (login, refresh, API-key creation)                                                                    |
| Server authentication providers                                               | User-info, token and JWKS requests of Auth0, Clerk, Firebase, WorkOS, Supabase, Better Auth, OAuth2, Keycloak and Cognito                                                                                           |
| Observability exporters (HTTP API)                                            | Langfuse, LangSmith, Datadog, Arize, Braintrust, Laminar, PostHog, OTLP HTTP exporter classes                                                                                                                       |
| `neurolink proxy` server upstreams                                            | `api.anthropic.com`, `chatgpt.com` (Codex), the Vertex AI Claude passthrough and the account quota endpoints                                                                                                        |
| Google Application Default Credentials                                        | The token requests `google-auth-library` makes for Vertex AI service accounts read `HTTPS_PROXY` and `NO_PROXY` themselves (an `http://` proxy URL). They follow that library's rules, not `NEUROLINK_PROXY_STRICT` |

### Not Routed Through the Proxy

These still connect directly, whatever the proxy variables say:

- **WebSockets**: Gemini Live, OpenAI Realtime, LiveKit voice sessions, Deepgram streaming transcription, and the MCP WebSocket transport.
- **API calls of the Replicate, Beatoven and D-ID providers** (Replicate image/music/avatar generation, Beatoven music, D-ID avatars). Their media _downloads_ are proxied (see above); the requests that start and poll a job are not.
- **Other AWS clients and credential lookups**: the S3 skill store, the `neurolink sagemaker` management commands, and the AWS credential chain (STS, SSO, instance metadata) use the AWS SDK's own transport. Only the Bedrock and SageMaker inference clients above are proxy-aware.
- **Vertex AI video generation** (Veo): the REST calls use global `fetch`. Only its Application Default Credentials token request is proxied, by the library above.
- **URLs you pass as input** that NeuroLink downloads for you: document and image URLs handled by the file processors and the generic image path, RAG web loaders, audio URLs given to speech-to-text, slide-image URLs and the video director pipeline's asset downloads. Gemini inline image URLs are the exception (proxied, see above).
- **Remote model catalogs** loaded by URL (dynamic model configuration).
- **Peer-to-peer proxy sharing** (`neurolink proxy share` / peers), which talks to other NeuroLink proxies, usually on a private network.
- **The `neurolink proxy` CLI's calls to the local proxy server** (health and status checks on `127.0.0.1`).
- **OpenTelemetry export** through NeuroLink's providers (the OTLP HTTP trace, metric and log exporters and the Langfuse span processor), which send with Node's own HTTP client, and the **Sentry exporter**, which uses the Sentry SDK's own transport.
- **The client SDK** (`@juspay/neurolink/client`): it uses global `fetch`, so the browser's networking and proxy settings apply in a browser and none apply in Node.
- Anything not listed above, such as database, Redis and vector-store clients, which use their own networking.

The `neurolink proxy` server honours `HTTPS_PROXY` for its upstream calls too. Its Claude (`/v1/messages`), Codex and Vertex upstream requests never fall back to a direct connection: a proxy failure fails the attempt, and the server's normal account retry and failover handle it. Its account quota polling follows the default rules above.

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

The repository's `test:proxy-egress` suite drives a local forward proxy and checks that a sample of call sites (ElevenLabs TTS and STT, ElevenLabs Music, the MCP HTTP transport, the Keycloak and OAuth2 JWKS downloads, Codex and Anthropic OAuth refreshes through the CLI, the proxy server's Codex upstream and a multipart image request) go through it, that `NO_PROXY` keeps listed hosts direct, that strict mode fails closed and that SOCKS is refused. `test:proxy-codex-outbound-fallback` covers the Vertex upstream of the proxy server, and `test:google-genai-proxy` the Google GenAI SDK path.

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

Both honour `NO_PROXY` and apply the same fallback rules (`NEUROLINK_PROXY_STRICT`). `proxyAwareFetch` reads the environment on every request. A client built with `createProxyFetch` checks whether any proxy variable is set when it is created, so set the variables before your application creates its `NeuroLink` instance; a client created while none was set keeps connecting directly. With no proxy variable set, requests are sent exactly as before.

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
