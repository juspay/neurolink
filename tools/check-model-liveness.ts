#!/usr/bin/env tsx
/**
 * Catalog model liveness gate.
 *
 * Vendors retire models without telling us. Until this existed, the only
 * signal was a user hitting a 404: Groq deleted its entire llama/gemma/mixtral
 * lineup and every one of the seven ids in its catalog entry went dead, while
 * the nightly matrix stayed green because it skips providers whose keys are
 * absent — and silence looked like success.
 *
 * For every catalog provider this checks three things:
 *   1. LIVENESS  — a real 1-token call to the default model. A vendor
 *      "model not found / decommissioned / not deployed" reply is a hard
 *      failure; a network blip or auth problem is inconclusive, not a failure.
 *   2. ROSTER    — catalog ids that the vendor's own /models listing no longer
 *      returns. A SOFT signal by design: Fireworks lists models it will not
 *      actually serve to this account, so absence from the roster warns and
 *      presence never excuses a failed call.
 *   3. STALENESS — how long since evidence.rosterVerified.date. Old evidence
 *      is not proof of rot, but it is proof nobody has looked.
 *
 * Providers whose API key is absent are reported as SKIPPED and counted. They
 * are never silently omitted: an unseen provider is the failure mode this file
 * exists to prevent. A run in which EVERY provider is skipped fails outright —
 * that is not "nothing wrong", it is "no key reached the job".
 *
 * Source-only and buildless (same contract as verify-provider-onboarding.ts):
 * it reads the catalog JSON and talks to vendors over HTTP, so it never needs
 * `pnpm run build` and never depends on dist/.
 *
 * Run: pnpm run check:models            (human output; what CI runs, and what
 *                                       it pastes into the rot-tracking issue)
 *      pnpm run check:models -- --json  (machine output, for scripted callers)
 */

import "dotenv/config";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseProviderCatalogJson } from "../src/lib/providers/catalog/schema.js";
import type { ProviderCatalogJson } from "../src/lib/types/index.js";

const CATALOG_DIR = join(process.cwd(), "src/lib/providers/catalog");
const STALE_AFTER_DAYS = 90;
const PROBE_TIMEOUT_MS = 30_000;
const jsonMode = process.argv.includes("--json");

type ModelVerdict = "alive" | "dead" | "inconclusive";

type ProviderReport = {
  provider: string;
  skipped?: string;
  defaultModel?: string;
  defaultVerdict?: ModelVerdict;
  defaultError?: string;
  missingFromRoster?: string[];
  rosterError?: string;
  evidenceDate?: string;
  evidenceAgeDays?: number;
  stale?: boolean;
};

// Vendors phrase a retired model differently — Groq says "decommissioned",
// Fireworks "not deployed", OpenAI-compat "does not exist". Matching the
// union keeps one dead model from reading as a transient outage.
const DEAD_MODEL_PATTERNS =
  /model[_ ]?not[_ ]?found|does not exist|decommissioned|not deployed|inaccessible|no such model|unknown model|invalid[_ ]model/i;

function loadCatalog(): ProviderCatalogJson[] {
  return readdirSync(CATALOG_DIR)
    .filter((f) => f.endsWith(".json") && !f.endsWith(".schema.json"))
    .sort()
    .map((f) =>
      parseProviderCatalogJson(
        JSON.parse(readFileSync(join(CATALOG_DIR, f), "utf8")),
        f,
      ),
    );
}

// Mirrors the loader's env-var convention. Reimplemented rather than imported
// so a bug in the loader cannot make this gate look at the wrong variable and
// report a live provider as unkeyed.
function apiKeyEnvVar(entry: ProviderCatalogJson): string {
  return (
    entry.wire.envOverrides?.apiKey ??
    `${entry.id.toUpperCase().replace(/-/g, "_")}_API_KEY`
  );
}

function extraEnvVar(entry: ProviderCatalogJson): string | undefined {
  const extra = entry.wire.extraCredentials?.[0];
  if (!extra) {
    return undefined;
  }
  const snake = extra.replace(/([A-Z])/g, "_$1").toUpperCase();
  return `${entry.id.toUpperCase().replace(/-/g, "_")}_${snake}`;
}

function resolveBaseURL(entry: ProviderCatalogJson): string | undefined {
  if (entry.wire.baseURL) {
    return entry.wire.baseURL;
  }
  const template = entry.wire.baseURLTemplate;
  const extraKey = entry.wire.extraCredentials?.[0];
  const varName = extraEnvVar(entry);
  if (!template || !extraKey || !varName) {
    return undefined;
  }
  const value = process.env[varName];
  return value ? template.replace(`{${extraKey}}`, value) : undefined;
}

async function probeModel(
  baseURL: string,
  key: string,
  model: string,
): Promise<{ verdict: ModelVerdict; error?: string }> {
  try {
    const res = await fetch(`${baseURL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: "ping" }],
        max_tokens: 1,
      }),
      // A vendor can accept the connection and then never answer — Fireworks'
      // deepseek-v4-pro does exactly that. Without a deadline one such model
      // stalls every provider after it and the run never reaches its exit(1),
      // so the gate dies quietly: the precise failure this file exists to
      // prevent, arriving by a different route.
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    });
    if (res.ok) {
      return { verdict: "alive" };
    }
    // 401/403/429/5xx say nothing about whether the model exists, and their
    // bodies can still carry dead-looking wording — a plan limit says
    // "inaccessible", a rate limit can say "invalid model". Decide on the
    // status first so the pattern never gets first refusal on those.
    if (
      res.status === 401 ||
      res.status === 403 ||
      res.status === 429 ||
      res.status >= 500
    ) {
      return { verdict: "inconclusive", error: `HTTP ${res.status}` };
    }
    const body = (await res.text()).slice(0, 400);
    if (DEAD_MODEL_PATTERNS.test(body)) {
      return { verdict: "dead", error: body.slice(0, 160) };
    }
    return { verdict: "inconclusive", error: `HTTP ${res.status}` };
  } catch (err) {
    return {
      verdict: "inconclusive",
      error: err instanceof Error ? err.message.slice(0, 120) : String(err),
    };
  }
}

async function fetchRoster(
  baseURL: string,
  key: string,
): Promise<{ ids?: Set<string>; error?: string }> {
  try {
    const res = await fetch(`${baseURL}/models`, {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    });
    if (!res.ok) {
      return { error: `HTTP ${res.status}` };
    }
    const body = (await res.json()) as { data?: Array<{ id?: string }> };
    return {
      ids: new Set((body.data ?? []).flatMap((m) => (m.id ? [m.id] : []))),
    };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message.slice(0, 120) : String(err),
    };
  }
}

function daysSince(dateStr: string): number | undefined {
  const then = Date.parse(dateStr);
  if (Number.isNaN(then)) {
    return undefined;
  }
  return Math.floor((Date.now() - then) / 86_400_000);
}

async function main(): Promise<void> {
  const entries = loadCatalog();
  const reports: ProviderReport[] = [];

  for (const entry of entries) {
    const keyVar = apiKeyEnvVar(entry);
    const key = process.env[keyVar];
    const evidenceDate = entry.evidence.rosterVerified.date;
    const ageDays = daysSince(evidenceDate);
    const base: ProviderReport = {
      provider: entry.id,
      evidenceDate,
      evidenceAgeDays: ageDays,
      stale: ageDays !== undefined && ageDays > STALE_AFTER_DAYS,
    };

    const baseURL = resolveBaseURL(entry);
    if (!key || !baseURL) {
      reports.push({
        ...base,
        skipped: !key ? `no ${keyVar}` : `cannot resolve base URL`,
      });
      continue;
    }

    const { verdict, error } = await probeModel(
      baseURL,
      key,
      entry.models.default,
    );
    const roster = await fetchRoster(baseURL, key);
    // Retired ids are kept in the catalog on purpose (the frozen
    // public-surface snapshot pins their enum members), so they are absent
    // from the vendor roster BY DESIGN. Reporting them would mean every run
    // re-lists dozens of already-known-dead models — and a gate that cries
    // wolf gets muted, which is how this rot survived the first time.
    const missing = roster.ids
      ? Object.entries(entry.models.catalog)
          .filter(([, spec]) => spec.status !== "retired")
          .map(([model]) => model)
          .filter((model) => !roster.ids?.has(model))
      : undefined;

    reports.push({
      ...base,
      defaultModel: entry.models.default,
      defaultVerdict: verdict,
      defaultError: error,
      missingFromRoster: missing,
      rosterError: roster.error,
    });
  }

  const deadDefaults = reports.filter((r) => r.defaultVerdict === "dead");
  const staleEvidence = reports.filter((r) => r.stale);
  const skipped = reports.filter((r) => r.skipped);
  const rosterGaps = reports.filter(
    (r) => (r.missingFromRoster?.length ?? 0) > 0,
  );

  if (jsonMode) {
    console.log(
      JSON.stringify(
        { reports, deadDefaults: deadDefaults.map((r) => r.provider) },
        null,
        2,
      ),
    );
  } else {
    for (const r of reports) {
      if (r.skipped) {
        console.log(`⊘ ${r.provider.padEnd(12)} SKIPPED — ${r.skipped}`);
        continue;
      }
      const mark =
        r.defaultVerdict === "alive"
          ? "✓"
          : r.defaultVerdict === "dead"
            ? "✗"
            : "?";
      console.log(
        `${mark} ${r.provider.padEnd(12)} default=${r.defaultModel} (${r.defaultVerdict}${r.defaultError ? `: ${r.defaultError.slice(0, 60)}` : ""})`,
      );
      if (r.missingFromRoster?.length) {
        console.log(
          `    ⚠ ${r.missingFromRoster.length} catalog model(s) absent from the vendor roster: ${r.missingFromRoster.slice(0, 4).join(", ")}${r.missingFromRoster.length > 4 ? " …" : ""}`,
        );
      }
      if (r.stale) {
        console.log(
          `    ⚠ evidence.rosterVerified is ${r.evidenceAgeDays} days old (limit ${STALE_AFTER_DAYS})`,
        );
      }
    }
    console.log(
      `\n${reports.length - skipped.length} checked, ${skipped.length} skipped, ${deadDefaults.length} dead default(s), ${rosterGaps.length} with roster gaps, ${staleEvidence.length} with stale evidence`,
    );
    if (skipped.length > 0) {
      console.log(
        `NOTE: skipped providers are unverified, not healthy — add their keys to see them.`,
      );
    }
  }

  // A run that verified nothing is not a green run: every provider skipped
  // means no key reached the job at all (misnamed secrets, wrong env block),
  // and that must read as failure, not health.
  if (reports.length > 0 && skipped.length === reports.length) {
    console.error(
      `\n✗ nothing was verified: all ${reports.length} providers were skipped — check that the API-key secrets reach this job`,
    );
    process.exit(1);
  }

  // Otherwise only a vendor-confirmed dead default fails the gate. Roster gaps
  // and stale evidence are warnings: neither proves a broken provider, and a
  // gate that cries wolf gets muted, which is how this rot survived at first.
  if (deadDefaults.length > 0) {
    console.error(
      `\n✗ ${deadDefaults.length} provider(s) have a retired default model: ${deadDefaults.map((r) => r.provider).join(", ")}`,
    );
    process.exit(1);
  }
}

await main();
