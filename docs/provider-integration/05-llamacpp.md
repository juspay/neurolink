# llama.cpp Native Provider

This is the current implementation guide. The original SDK-wrapper listing is
available in git history at `c829f4de`; do not reinstall removed packages to
follow it. For a new integration, start at [Provider Onboarding Tiers](tiers/README.md).

## Runtime and configuration

`src/lib/providers/llamaCpp.ts` extends `OpenAIChatCompletionsProvider`. It uses direct
HTTP JSON requests for ordinary `generate()` and SSE for `stream()`;
message conversion, multi-step tool execution, and stream lifecycle handling
live in the shared native base.

| Setting           | Value                                                             |
| ----------------- | ----------------------------------------------------------------- |
| Provider ID       | `llamacpp`                                                        |
| Credentials key   | `llamacpp`                                                        |
| Default base URL  | `http://localhost:8080/v1`                                        |
| Endpoint override | `LLAMACPP_BASE_URL`                                               |
| API key override  | `LLAMACPP_API_KEY`                                                |
| Model             | Explicit `model` or the provider's environment/default resolution |

## Provider-specific behavior

- `llama-server` hosts the model selected at startup. With no explicit model or
  `LLAMACPP_MODEL`, the native base uses `/models`; `loaded-model` is a fallback
  label rather than a downloaded model.
- Authentication defaults to the `llamacpp` placeholder key. Explicit bearer
  credentials and base URLs support an authenticating reverse proxy.
- `validateConfiguration()` probes the models endpoint. Pointing at an unrelated
  HTTP service can return 405; that does not exercise a working llama.cpp backend.
- Tool support depends on the model/chat template. Start a compatible server
  with `--jinja` where required; vision additionally needs a vision-capable model.
- Connection errors and rejected tool requests are returned with provider-specific
  guidance. The native base owns retries, timeouts, and incremental delivery.

## SDK: exercise both modes

Use an available model ID for your account or loaded local model. The example
below calls the two public surfaces independently; it does not pass a Vercel
model adapter into NeuroLink.

```typescript
import { NeuroLink } from "@juspay/neurolink";

const sdk = new NeuroLink();
const options = {
  provider: "llamacpp",
  model: "loaded-model",
  input: { text: "Reply with HELLO." },
  disableTools: true,
  maxTokens: 256,
};

try {
  const generated = await sdk.generate(options);
  console.log(generated.content);

  const streamed = await sdk.stream(options);
  for await (const chunk of streamed.stream) {
    if ("content" in chunk) process.stdout.write(chunk.content);
  }
} finally {
  await sdk.shutdown();
}
```

Per-call `credentials.llamacpp` accepts `apiKey` and `baseURL`; it overrides
instance/environment defaults. For local providers, omit the example's `model`
to test discovery instead of specifying a fallback label.

## Tools and schemas

Register tools with `sdk.registerTool()` or pass the package's `tool()` helper.
Use the top-level `schema` option for structured `generate()` output; a prose
answer alone is not proof that the schema or a tool was honored. Tests should
assert an executed tool result and validate `structuredData`, not merely check
that content is nonempty. Check stream tool execution independently.

## Verification and limitations

```bash
pnpm run build
pnpm run test:new-providers
pnpm exec tsx test/continuous-test-suite-provider-matrix.ts --provider=llamacpp
```

Live checks require credentials or the relevant local server. Use deterministic
HTTP stand-ins to verify wire bodies, retries, and cancellation even when live
access is unavailable. Record blocked/skipped live cells explicitly.

- [Native architecture](00-architecture.md)
- [New-provider test coverage](08-feature-matrix.md)
