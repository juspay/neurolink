#!/usr/bin/env tsx
/** Public SDK workflow proof with recorded model answers and connector data.
 * Runs through the shipped entry and NeuroLink.auditImageAds; no paid calls. */
import assert from "node:assert/strict";
import sharp from "sharp";
import { MockAgent, getGlobalDispatcher, setGlobalDispatcher } from "undici";
import {
  NeuroLink,
  createImageAdsAuditor,
  createApifyImageAdsSource,
  type AdsImageAuditInput,
  type AdsImageAuditConfig,
  type AdsImageAuditAd,
  type AdsImageAuditProgress,
  type GenerateResult,
  type DecisionOptions,
} from "../dist/index.js";
import { defineSuite } from "./helpers/harness.js";

const { test, runSuite } = defineSuite("Image ads audit public SDK", {
  offline: true,
});
const input: AdsImageAuditInput = {
  merchant: {
    storeUrl: "https://merchant.example.com",
    context: { name: "Merchant", products: ["Books and learning"] },
  },
  competitors: [
    {
      storeUrl: "https://one.example.com",
      context: { name: "One", products: ["Books"] },
    },
    {
      storeUrl: "https://two.example.com",
      context: { name: "Two", products: ["Books"] },
    },
  ],
};
const rubric = {
  criteria: ["product", "legibility", "cta"].map((id) => ({
    id,
    label: id,
    instructions: "Assess visible " + id,
    levels: ["absent", "weak", "clear", "strong"],
    weight: 1,
  })),
};
const draft = {
  title: "Improve CTA",
  change: "Test a clearer CTA",
  criterionId: "cta",
  competitorStoreId: "competitor_1",
  rationale: "Measured shared rubric gap; not proof of conversion.",
};
const rows: AdsImageAuditAd[] = [input.merchant, ...input.competitors].map(
  (entry, index) => ({
    id: String(100 + index),
    pageId: "12345",
    imageUrl: "https://images.example.com/ad.png?signature=fixture-secret",
    destinationUrl: entry.storeUrl + "/products/book",
    firstShown: "2026-10-09",
    headline: "Read today",
    bodyText: "",
    cta: "Shop now",
    provenance: "connector",
  }),
);
const png = await sharp({
  create: { width: 64, height: 64, channels: 3, background: "#eeaabb" },
})
  .png()
  .toBuffer();
const score = (value: number, confidence = 1) => ({
  type: "score" as const,
  score: value,
  confidence,
  probabilities: Object.fromEntries(
    [0, 1, 2, 3].map((index) => [String(index), index === value ? 1 : 0]),
  ),
  legend: {},
});
const fixture = () => {
  const calls = {
    generations: [] as Parameters<NeuroLink["generate"]>[0][],
    decisions: [] as DecisionOptions[],
    targets: [] as unknown[],
    progress: [] as AdsImageAuditProgress[],
  };
  const client = new NeuroLink({ conversationMemory: { enabled: false } });
  client.generate = async (request) => {
    calls.generations.push(request);
    return {
      content: JSON.stringify(
        calls.generations.length === 1 ? rubric : { actions: [draft] },
      ),
      provider: "anthropic",
      model: "fixture",
    } as GenerateResult;
  };
  client.decide = async (request) => {
    calls.decisions.push(request);
    if (request.provider === "typesafe") {
      return {
        provider: "typesafe",
        model: "fixture",
        answers: {
          relevant_0: { type: "boolean", probability: 0.95 },
          priority_0: {
            type: "score",
            score: 2,
            confidence: 0.9,
            probabilities: { "0": 0, "1": 0, "2": 1 },
            legend: {},
          },
        },
        usage: { inputTokens: 1, outputTokens: 1 },
        latencyMs: 1,
      };
    }
    const index = calls.decisions.filter(
      (call) => call.provider === "xor",
    ).length;
    return {
      provider: "xor",
      model: "fixture",
      answers: Object.fromEntries(
        rubric.criteria.map((criterion) => [
          criterion.id,
          score(index === 1 ? 1 : 3),
        ]),
      ),
      usage: { inputTokens: 1, outputTokens: 1 },
      latencyMs: 1,
    };
  };
  const config: AdsImageAuditConfig = {
    generation: { provider: "anthropic", model: "fixture" },
    market: "IN",
    adSource: {
      fetchAds: async (stores, options) => {
        calls.targets.push({ stores, options });
        return rows;
      },
    },
    imageLoader: async () => png,
    onProgress: (event) => calls.progress.push(event),
  };
  return { client, config, calls };
};
const withFixture = async (
  fn: (currentFixture: ReturnType<typeof fixture>) => Promise<void>,
) => {
  const current = fixture();
  try {
    await fn(current);
  } finally {
    await current.client.dispose();
  }
};

await test("SDK owns full context-to-report workflow with separate XOR images and text-only JEV", async () =>
  withFixture(async ({ client, config, calls }) => {
    const report = await client.auditImageAds(input, config);
    assert.deepEqual(
      report.assessments.map((value) => value.ad?.id),
      ["100", "101", "102"],
    );
    assert.deepEqual(
      report.assessments.map((value) => value.percent),
      [33, 100, 100],
    );
    assert.equal(report.actions[0].status, "recommended");
    assert.equal(calls.targets.length, 1);
    assert.equal(calls.generations.length, 2);
    assert.equal(calls.decisions.length, 4);
    for (const request of calls.decisions.slice(0, 3)) {
      assert.equal(request.provider, "xor");
      assert.equal(request.images?.length, 1);
      const buffer = request.images?.[0];
      assert.ok(Buffer.isBuffer(buffer));
      assert.equal((await sharp(buffer).metadata()).format, "jpeg");
      assert.equal(request.video, undefined);
      assert.deepEqual(Object.keys(request.questions), [
        "product",
        "legibility",
        "cta",
      ]);
    }
    assert.equal(calls.decisions[3].images, undefined);
    assert.equal(calls.decisions[3].provider, "typesafe");
    assert.match(report.disclaimer, /not ROAS/);
    assert.deepEqual(
      [...new Set(calls.progress.map((event) => event.stage))],
      [
        "context",
        "rubric",
        "discovery",
        "assessment",
        "actions",
        "review",
        "report",
      ],
    );
    assert.ok(!JSON.stringify(calls.progress).includes("fixture-secret"));
  }));
await test("configure once and send context repeatedly through the reusable public factory", async () =>
  withFixture(async ({ client, config, calls }) => {
    const audit = createImageAdsAuditor(client, config);
    await audit(input);
    calls.generations.length = 0;
    calls.decisions.length = 0;
    await audit(input);
    assert.equal(calls.decisions.length, 4);
  }));
await test("supplied context bypasses Shopify research", async () =>
  withFixture(async ({ client, config }) => {
    config.storeReader = async () => {
      throw new Error("Research must not run");
    };
    assert.equal(
      (await client.auditImageAds(input, config)).assessments.length,
      3,
    );
  }));
await test("URL-only calls delegate all research to the SDK-configured researcher", async () =>
  withFixture(async ({ client, config }) => {
    let count = 0;
    config.storeReader = async (entry, index) => {
      count++;
      return {
        id: index === 0 ? "merchant" : "competitor_" + index,
        role: index === 0 ? "merchant" : "competitor",
        origin: entry.storeUrl,
        name: "Fixture",
        products: ["Books"],
      };
    };
    const request = {
      merchant: { storeUrl: input.merchant.storeUrl },
      competitors: input.competitors.map((entry) => ({
        storeUrl: entry.storeUrl,
      })),
    };
    await client.auditImageAds(request, config);
    assert.equal(count, 3);
  }));
await test("wrong researcher identity fails before scrape and inference", async () =>
  withFixture(async ({ client, config, calls }) => {
    config.storeReader = async () => ({
      id: "merchant",
      role: "merchant",
      origin: "https://wrong.example.com",
      name: "Wrong",
      products: ["Books"],
    });
    await assert.rejects(
      client.auditImageAds(
        {
          merchant: { storeUrl: input.merchant.storeUrl },
          competitors: input.competitors,
        },
        config,
      ),
    );
    assert.equal(calls.targets.length, 0);
    assert.equal(calls.generations.length, 0);
  }));
await test("supplied images need no ad-source connector", async () =>
  withFixture(async ({ client, config, calls }) => {
    delete config.adSource;
    const request = {
      merchant: { ...input.merchant, imageUrl: rows[0].imageUrl },
      competitors: input.competitors.map((entry) => ({
        ...entry,
        imageUrl: rows[0].imageUrl,
      })),
    };
    const report = await client.auditImageAds(request, config);
    assert.equal(calls.targets.length, 0);
    assert.ok(
      report.assessments.every((value) => value.ad?.provenance === "supplied"),
    );
  }));
await test("missing connector fails before external calls", async () =>
  withFixture(async ({ client, config, calls }) => {
    delete config.adSource;
    await assert.rejects(client.auditImageAds(input, config), /connector/);
    assert.equal(calls.generations.length, 0);
  }));
await test("market and deployed decision model overrides propagate", async () =>
  withFixture(async ({ client, config, calls }) => {
    config.market = "GB";
    config.decisionModels = { xor: "xor-1.2", typesafe: "jev-fixture" };
    await client.auditImageAds(input, config);
    assert.equal(calls.decisions[0].model, "xor-1.2");
    assert.equal(calls.decisions[3].model, "jev-fixture");
    assert.match(JSON.stringify(calls.targets), /"market":"GB"/);
  }));
for (const value of [
  "http://merchant.example.com",
  "https://localhost",
  "https://127.0.0.1",
  "https://[::ffff:7f00:1]",
  "https://user:password@merchant.example.com",
  "https://merchant.example.com:8080",
]) {
  await test("unsafe URL fails before I/O: " + value, async () =>
    withFixture(async ({ client, config, calls }) => {
      await assert.rejects(
        client.auditImageAds(
          { ...input, merchant: { ...input.merchant, storeUrl: value } },
          config,
        ),
      );
      assert.equal(calls.targets.length, 0);
      assert.equal(calls.generations.length, 0);
    }),
  );
}
await test("duplicate domains and oversized context are rejected", async () =>
  withFixture(async ({ client, config }) => {
    await assert.rejects(
      client.auditImageAds({ ...input, competitors: [input.merchant] }, config),
    );
    await assert.rejects(
      client.auditImageAds(
        {
          ...input,
          merchant: {
            ...input.merchant,
            context: { name: "x".repeat(1201), products: ["Books"] },
          },
        },
        config,
      ),
    );
  }));
await test("missing merchant evidence is unavailable rather than zero or invented actions", async () =>
  withFixture(async ({ client, config }) => {
    config.adSource = { fetchAds: async () => rows.slice(1) };
    const report = await client.auditImageAds(input, config);
    assert.equal(report.assessments[0].status, "unavailable");
    assert.equal(report.assessments[0].percent, undefined);
    assert.equal(report.actions.length, 0);
  }));
await test("source failure yields honest missing evidence without extra paid retries", async () =>
  withFixture(async ({ client, config, calls }) => {
    let attempts = 0;
    config.adSource = {
      fetchAds: async () => {
        attempts++;
        throw new Error("secret");
      },
    };
    const report = await client.auditImageAds(input, config);
    assert.equal(attempts, 1);
    assert.equal(calls.decisions.length, 0);
    assert.ok(
      report.warnings.some((value) => value.includes("discovery failed")),
    );
    assert.ok(!JSON.stringify(report).includes("secret"));
  }));
await test("exact domain matching selects newest eligible candidate deterministically", async () =>
  withFixture(async ({ client, config }) => {
    config.adSource = {
      fetchAds: async () => [
        ...rows,
        { ...rows[0], id: "999", firstShown: "2026-10-10" },
        {
          ...rows[0],
          id: "998",
          firstShown: "2026-10-11",
          destinationUrl: "https://merchant.example.com.evil.com",
        },
      ],
    };
    assert.equal(
      (await client.auditImageAds(input, config)).assessments[0].ad?.id,
      "999",
    );
  }));
await test("conflicting duplicate IDs cannot win by row order", async () =>
  withFixture(async ({ client, config }) => {
    config.adSource = {
      fetchAds: async () => [
        ...rows,
        { ...rows[0], headline: "Conflicting evidence" },
      ],
    };
    assert.equal(
      (await client.auditImageAds(input, config)).assessments[0].status,
      "unavailable",
    );
  }));
await test("malformed dates and invalid image bytes fail closed", async () =>
  withFixture(async ({ client, config }) => {
    config.adSource = {
      fetchAds: async () => [
        { ...rows[0], firstShown: "2026-02-30" },
        ...rows.slice(1),
      ],
    };
    config.imageLoader = async () => Buffer.from("<svg/>");
    assert.ok(
      (await client.auditImageAds(input, config)).assessments.every(
        (value) => value.status === "unavailable",
      ),
    );
  }));
await test("failed media affects only its own assessment and hides raw errors", async () =>
  withFixture(async ({ client, config }) => {
    let count = 0;
    config.imageLoader = async () => {
      if (count++ === 0) {
        throw new Error("credential-secret");
      }
      return png;
    };
    const report = await client.auditImageAds(input, config);
    assert.equal(report.assessments[0].status, "unavailable");
    assert.equal(report.assessments[1].status, "assessed");
    assert.ok(!JSON.stringify(report).includes("credential-secret"));
  }));
await test("invalid distributions never produce a score", async () =>
  withFixture(async ({ client, config }) => {
    client.decide = async () => ({
      provider: "xor",
      model: "fixture",
      answers: { product: score(1, 2) },
      usage: { inputTokens: 1, outputTokens: 1 },
      latencyMs: 1,
    });
    assert.ok(
      (await client.auditImageAds(input, config)).assessments.every(
        (value) => value.status === "unavailable",
      ),
    );
  }));
await test("wrong inference provider cannot be treated as image evidence", async () =>
  withFixture(async ({ client, config }) => {
    client.decide = async () => ({
      provider: "typesafe",
      model: "fixture",
      answers: {},
      usage: { inputTokens: 1, outputTokens: 1 },
      latencyMs: 1,
    });
    assert.ok(
      (await client.auditImageAds(input, config)).assessments.every(
        (value) => value.status === "unavailable",
      ),
    );
  }));
await test("low-confidence score gaps suppress actions before JEV", async () =>
  withFixture(async ({ client, config, calls }) => {
    const decide = client.decide;
    client.decide = async (request) => {
      const result = await decide(request);
      if (request.provider === "xor") {
        Object.values(result.answers).forEach((answer) => {
          if (answer.type === "score") {
            answer.confidence = 0.1;
          }
        });
      }
      return result;
    };
    assert.equal((await client.auditImageAds(input, config)).actions.length, 0);
    assert.equal(
      calls.decisions.filter((request) => request.provider === "typesafe")
        .length,
      0,
    );
  }));
await test("failed JEV review suppresses unchecked recommendations", async () =>
  withFixture(async ({ client, config }) => {
    const decide = client.decide;
    client.decide = async (request) => {
      if (request.provider === "typesafe") {
        throw new Error("secret");
      }
      return decide(request);
    };
    const report = await client.auditImageAds(input, config);
    assert.equal(report.actions.length, 0);
    assert.ok(
      report.warnings.some((value) => value.includes("JEV review failed")),
    );
  }));
await test("uncertain JEV priority is marked review", async () =>
  withFixture(async ({ client, config }) => {
    const decide = client.decide;
    client.decide = async (request) => {
      const result = await decide(request);
      const answer = result.answers.priority_0;
      if (answer?.type === "score") {
        answer.confidence = 0.1;
      }
      return result;
    };
    assert.equal(
      (await client.auditImageAds(input, config)).actions[0].status,
      "review",
    );
  }));
await test("invalid rubric fails without disposing a caller-owned SDK instance", async () =>
  withFixture(async ({ client, config }) => {
    client.generate = async () =>
      ({
        content: '{"criteria":[]}',
        provider: "anthropic",
        model: "fixture",
      }) as GenerateResult;
    await assert.rejects(client.auditImageAds(input, config));
    assert.equal(typeof client.auditImageAds, "function");
  }));
await test("pre-aborted calls perform no work", async () =>
  withFixture(async ({ client, config, calls }) => {
    config.signal = AbortSignal.abort();
    await assert.rejects(client.auditImageAds(input, config));
    assert.equal(calls.generations.length, 0);
    assert.equal(calls.targets.length, 0);
  }));
await test("aborting during discovery stops before image assessment", async () =>
  withFixture(async ({ client, config, calls }) => {
    const controller = new AbortController();
    config.signal = controller.signal;
    config.adSource = {
      fetchAds: async () => {
        controller.abort();
        return rows;
      },
    };
    await assert.rejects(client.auditImageAds(input, config));
    assert.equal(calls.decisions.length, 0);
  }));
await test("throwing progress observers cannot break a report", async () =>
  withFixture(async ({ client, config }) => {
    config.onProgress = () => {
      throw new Error("observer");
    };
    assert.equal(
      (await client.auditImageAds(input, config)).assessments.length,
      3,
    );
  }));

await test("malformed probability distributions and fabricated scores are refused", async () =>
  withFixture(async ({ client, config, calls }) => {
    for (const malformed of [
      { ...score(1), probabilities: { "0": 0, "1": 0.5, "2": 0, "3": 0 } },
      { ...score(1), score: 3 },
      { ...score(1), probabilities: { "0": -1, "1": 2, "2": 0, "3": 0 } },
    ]) {
      calls.generations.length = 0;
      client.decide = async () => ({
        provider: "xor",
        model: "fixture",
        answers: Object.fromEntries(
          rubric.criteria.map((item) => [item.id, malformed]),
        ),
        usage: { inputTokens: 1, outputTokens: 1 },
        latencyMs: 1,
      });
      const report = await client.auditImageAds(input, config);
      assert.ok(
        report.assessments.every((item) => item.status === "unavailable"),
      );
      assert.equal(report.actions.length, 0);
    }
  }));
await test("invented action citations are discarded before review", async () =>
  withFixture(async ({ client, config, calls }) => {
    client.generate = async (request) => {
      calls.generations.push(request);
      return {
        content: JSON.stringify(
          calls.generations.length === 1
            ? rubric
            : { actions: [{ ...draft, criterionId: "invented" }] },
        ),
        provider: "anthropic",
        model: "fixture",
      } as GenerateResult;
    };
    assert.equal((await client.auditImageAds(input, config)).actions.length, 0);
    assert.equal(
      calls.decisions.filter((item) => item.provider === "typesafe").length,
      0,
    );
  }));
await test("invalid JEV priority distributions suppress all recommendations", async () =>
  withFixture(async ({ client, config }) => {
    const decide = client.decide;
    client.decide = async (request) => {
      const result = await decide(request);
      const priority = result.answers.priority_0;
      if (priority?.type === "score") {
        priority.probabilities = { "0": 0, "1": 0, "2": 0.5 };
      }
      return result;
    };
    assert.equal((await client.auditImageAds(input, config)).actions.length, 0);
  }));
await test("synchronous source failures and oversized datasets degrade without unhandled work", async () =>
  withFixture(async ({ client, config, calls }) => {
    config.adSource = {
      fetchAds: () => {
        throw new Error("Source failed synchronously");
      },
    };
    assert.equal(
      (await client.auditImageAds(input, config)).assessments[0].status,
      "unavailable",
    );
    calls.generations.length = 0;
    config.adSource = { fetchAds: async () => Array(73).fill(rows[0]) };
    const report = await client.auditImageAds(input, config);
    assert.equal(report.assessments[0].status, "unavailable");
    assert.ok(
      report.warnings.some((value) => value.includes("discovery failed")),
    );
  }));
const originalDispatcher = getGlobalDispatcher();
const mock = new MockAgent();
mock.disableNetConnect();
setGlobalDispatcher(mock);
try {
  await test("public Apify connector starts one bounded run and returns normalized image ads", async () => {
    const pool = mock.get("https://api.apify.com");
    pool
      .intercept({ path: /^\/v2\/acts\//, method: "POST" })
      .reply(201, JSON.stringify({ data: { id: "Run1", status: "RUNNING" } }));
    pool
      .intercept({
        path: "/v2/actor-runs/Run1?waitForFinish=60",
        method: "GET",
      })
      .reply(
        200,
        JSON.stringify({
          data: {
            id: "Run1",
            status: "SUCCEEDED",
            defaultDatasetId: "Dataset1",
          },
        }),
      );
    const raw = {
      row_type: "ad",
      creative_id: "111",
      advertiser_id: "12345",
      is_active: true,
      ad_format: "image",
      cards: [],
      video_urls: [],
      image_url: rows[0].imageUrl,
      destination_url: rows[0].destinationUrl,
      first_shown: "2026-10-09",
      headline: "Read today",
      body_text: "",
      cta: "Shop now",
    };
    pool
      .intercept({
        path: "/v2/datasets/Dataset1/items?clean=true&limit=72",
        method: "GET",
      })
      .reply(
        200,
        JSON.stringify([
          raw,
          {
            ...raw,
            creative_id: "112",
            ad_format: "video",
            video_url: "https://images.example.com/video.mp4",
          },
        ]),
      );
    const source = createApifyImageAdsSource({ token: "fixture-token" });
    const ads = await source.fetchAds(
      [
        {
          id: "merchant",
          role: "merchant",
          origin: input.merchant.storeUrl,
          name: "Merchant",
          products: ["Books"],
        },
      ],
      { market: "IN" },
    );
    assert.equal(ads.length, 1);
    assert.equal(ads[0].id, "111");
    assert.equal(ads[0].provenance, "apify");
    mock.assertNoPendingInterceptors();
  });
  await test("failed Apify runs are not retried and missing tokens fail locally", async () => {
    mock
      .get("https://api.apify.com")
      .intercept({ path: /^\/v2\/acts\//, method: "POST" })
      .reply(201, JSON.stringify({ data: { id: "Run2", status: "FAILED" } }));
    const stores = [
      {
        id: "merchant",
        role: "merchant" as const,
        origin: input.merchant.storeUrl,
        name: "Merchant",
        products: ["Books"],
      },
    ];
    await assert.rejects(
      createApifyImageAdsSource({ token: "fixture" }).fetchAds(stores, {
        market: "IN",
      }),
    );
    assert.throws(() => createApifyImageAdsSource({ token: "" }));
    mock.assertNoPendingInterceptors();
  });
} finally {
  setGlobalDispatcher(originalDispatcher);
  await mock.close();
}
await runSuite();
