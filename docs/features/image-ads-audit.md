# Image ads audit

NeuroLink owns the images-only creative-audit workflow: storefront context,
ad discovery, exact destination-domain selection, safe media preparation,
shared-rubric generation, separate XOR assessments, score comparison and
TypeSafe/JEV action review. Applications supply inputs and render the typed report.
No video/audio processing, creative generation or ad publishing is performed.

## Configure once, submit context

```typescript
import {
  NeuroLink,
  createImageAdsAuditor,
  createApifyImageAdsSource,
} from "@juspay/neurolink";

const client = new NeuroLink({
  conversationMemory: { enabled: false },
  credentials: {
    xor: { baseURL: process.env.XOR_BASE_URL, apiKey: process.env.XOR_API_KEY },
    typesafe: { apiKey: process.env.TYPESAFE_API_KEY },
  },
});
const audit = createImageAdsAuditor(client, {
  generation: { provider: "vertex", model: "claude-sonnet-4-5@20250929" },
  market: "IN",
  adSource: createApifyImageAdsSource({ token: process.env.APIFY_API_TOKEN! }),
  onProgress: ({ stage, status, storeId }) => {
    // Send only these bounded fields to the application's structured logger.
  },
});

try {
  const report = await audit({
    merchant: {
      storeUrl: "https://merchant.example.com",
      context: {
        name: "Merchant",
        products: ["Books, fiction and stationery"],
      },
    },
    competitors: [
      {
        storeUrl: "https://competitor.example.com",
        context: {
          name: "Competitor",
          products: ["Books and learning products"],
        },
      },
    ],
  });
  // Display report.assessments, report.actions and report.warnings.
} finally {
  await client.dispose();
}
```

Replace placeholder domains with confirmed public storefront domains.
Generation credentials use the normal NeuroLink provider configuration.
Configure XOR and JEV before starting paid discovery/inference.

Alternatively, call `client.auditImageAds(input, config)`. Both entry points
use the same SDK workflow; neither disposes a caller-owned client. The configured
factory can be reused for many independent requests. Context is scoped to each
invocation, not accumulated across audits.

## Sources and inputs

- One merchant and one or two competitors; one single-image creative per store.
- Supplied `context: { name, products }` bypasses Shopify research. This supports
  non-Shopify stores and context assembled by any application.
- Without context, the built-in researcher reads public Shopify `meta.json`
  and a bounded product catalogue. Shopify IDs are never Facebook Page IDs.
- Optional `imageUrl` bypasses discovery for that store. If every store supplies
  an image, no ad-source connector or Apify token is needed.
- `adSource.fetchAds(stores, {market, signal})` is replaceable. A trusted connector
  must return normalized, active, single-image ads. NeuroLink independently
  validates their shape and destination domains before selecting candidates.
- The built-in Apify connector batches names into one run: three candidate Pages
  per name, eight ads per target, 72 rows maximum and a $0.10 total charge ceiling.
  It polls that existing run at most twice; it never starts paid retries.
- Market defaults to IN; set another ISO country code explicitly.
- Domain equality ignores only `www.`. Missing/ambiguous destination evidence
  remains unavailable. Matching is not proof of Page ownership or performance.
- Public HTTPS URLs only: no credentials, custom ports or private targets.
  Default downloads use the SDK's DNS-pinned transport and reject redirects.
  Through a configured proxy, private DNS destinations are the proxy's egress
  policy to enforce. Use canonical URLs, not tracking/redirect links.
- Images are decoded with optional `sharp`, limited to static JPEG/PNG/WebP,
  capped at 6 MiB downloaded / 16 megapixels, resized and stripped to a JPEG
  Buffer of at most 2 MiB. Install the optional dependency when deploying audits.
- Trusted `storeReader` and `imageLoader` adapters are available for approved
  transports. The SDK still validates returned identities and image bytes.

## Report interpretation and observability

One LLM generates a shared 3–6 criterion rubric. XOR receives one image at a
time with that same rubric. Percentages are weighted ordinal rubric scores,
not ROAS, conversion forecasts or confidence percentages. Missing evidence is
`unavailable`, never zero. Low-confidence score gaps cannot support an action.

The LLM drafts experiments only from measured gaps. JEV reviews their text,
context and scores, not the original images. Failed review suppresses unchecked
recommendations; uncertain judgments are marked `review`. Merchant/competitor
text is untrusted input, not instructions. Images are not copied or published.

Progress stages are `context`, `rubric`, `discovery`, `assessment`, `actions`,
`review`, `report`. SDK logs and the callback contain stage/status and optional
store ID only. Do not add credentials, media Buffers or signed URLs to logs.
Reports contain provenance URLs that can expire. Existing inference tracing may
record context/questions; apply your normal retention policy.
Pass `signal` to cancel discovery, downloads and inference.

## XOR from Hugging Face

[juspay/xor](https://huggingface.co/juspay/xor) hosts model weights and the
released serving bundle, not a ready-to-call inference URL. Deploy that bundle
with its documented Linux/NVIDIA runtime and point `credentials.xor.baseURL`
to its origin. The endpoint must expose `/v1/systemone`: ordinary text
`/v1/chat/completions` does not reproduce calibrated decision scoring.
Set `decisionModels: {xor: "xor-1.2"}` when that release is deployed.
The current SDK requires an XOR API key; expose an authenticated remote endpoint
and configure its real key. A Hugging Face download token is not that API key.

## Verification

```sh
pnpm run build
pnpm run test:image-ads-audit
```

The credential-free suite exercises public built exports and the real workflow
with recorded model answers, trusted transport fixtures and a mocked Apify API.
It proves contracts and failure handling, not live model quality.
