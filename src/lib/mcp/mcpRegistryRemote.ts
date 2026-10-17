/**
 * Remote registry helpers for MCPRegistryClient
 *
 * Pure functions that resolve a registry configuration to an API base URL,
 * validate responses from the official MCP Registry API (`/v0.1`) and map its
 * server records to `McpRegistryEntry`. Nothing here performs I/O.
 *
 * API reference (spec `2025-12-01`):
 * https://github.com/modelcontextprotocol/registry/blob/main/docs/reference/api/openapi.yaml
 *
 * @module mcp/mcpRegistryRemote
 */

import type {
  JsonObject,
  MCPTransportType,
  McpRegistryEntry,
  RegistryConfig,
  RemoteRegistryInput,
  RemoteRegistryPackage,
  RemoteRegistryPage,
  RemoteRegistryRecord,
  RemoteRegistryServer,
  RemoteRegistryTarget,
  RemoteRegistryTransport,
} from "../types/index.js";

/**
 * Base URL of the official MCP Registry
 */
export const OFFICIAL_REGISTRY_URL = "https://registry.modelcontextprotocol.io";

const API_VERSION_SEGMENT = "/v0.1";

/**
 * Key under which the official registry reports status and timestamps in `_meta`
 */
const OFFICIAL_META_KEY = "io.modelcontextprotocol.registry/official";

// A registry is untrusted input, and a custom registry URL is a supported
// feature. The npm identifier and version end up in an `npx` argv element and
// in an install command a user may paste into a shell, so they must be valid
// npm names and versions, not merely strings. The grammar is the npm
// package-name rule for new packages (optional `@scope/`, lowercase letters,
// digits and `._~-`, never a leading dash, dot or underscore) and a
// conservative version rule (starts alphanumeric). Anything else is not run.
const NPM_PACKAGE_NAME = /^(?:@[a-z0-9][a-z0-9._~-]*\/)?[a-z0-9][a-z0-9._~-]*$/;
const NPM_PACKAGE_NAME_MAX_LENGTH = 214;
const NPM_VERSION = /^[0-9A-Za-z][0-9A-Za-z.+_~-]*$/;
const NPM_VERSION_MAX_LENGTH = 128;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringField(
  record: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = record[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function arrayField(record: Record<string, unknown>, key: string): unknown[] {
  const value = record[key];
  return Array.isArray(value) ? value : [];
}

function compact<T>(items: ReadonlyArray<T | undefined>): T[] {
  return items.filter((item): item is T => item !== undefined);
}

function isLoopbackHost(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname === "[::1]" ||
    /^127(?:\.\d{1,3}){3}$/.test(hostname)
  );
}

/**
 * Resolve a registry configuration to the API base URL the client queries.
 *
 * Returns `undefined` for registries the client does not query: `npm` and
 * `github` sources, a `custom` registry without a URL, any URL that is not
 * plain `http(s)` or that embeds credentials (fetch rejects those, and they
 * would end up in logs), and a registry with an `authToken` on plain `http:`
 * to a non-loopback host (the bearer token would cross the network in clear).
 */
export function resolveRemoteTarget(
  config: RegistryConfig,
): RemoteRegistryTarget | undefined {
  if (config.type !== "official" && config.type !== "custom") {
    return undefined;
  }

  const rawUrl =
    config.url ?? (config.type === "official" ? OFFICIAL_REGISTRY_URL : "");

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return undefined;
  }

  if (
    (parsed.protocol !== "https:" && parsed.protocol !== "http:") ||
    parsed.username !== "" ||
    parsed.password !== ""
  ) {
    return undefined;
  }

  if (
    config.authToken &&
    parsed.protocol === "http:" &&
    !isLoopbackHost(parsed.hostname)
  ) {
    return undefined;
  }

  const path = parsed.pathname.replace(/\/+$/, "");
  const apiPath = path.endsWith(API_VERSION_SEGMENT)
    ? path
    : `${path}${API_VERSION_SEGMENT}`;

  return { config, apiBase: `${parsed.origin}${apiPath}` };
}

function parseInput(value: unknown): RemoteRegistryInput | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  const name = stringField(value, "name");
  return name === undefined
    ? undefined
    : {
        name,
        isRequired: value.isRequired === true,
        isSecret: value.isSecret === true,
      };
}

function parseTransport(value: unknown): RemoteRegistryTransport | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  const type = stringField(value, "type");
  if (type === undefined) {
    return undefined;
  }
  const url = stringField(value, "url");
  return url === undefined ? { type } : { type, url };
}

function parsePackage(value: unknown): RemoteRegistryPackage | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  const registryType = stringField(value, "registryType");
  const identifier = stringField(value, "identifier");
  if (registryType === undefined || identifier === undefined) {
    return undefined;
  }
  const version = stringField(value, "version");
  const transport = parseTransport(value.transport);

  return {
    registryType,
    identifier,
    ...(version === undefined ? {} : { version }),
    ...(transport === undefined ? {} : { transport }),
    environmentVariables: compact(
      arrayField(value, "environmentVariables").map(parseInput),
    ),
  };
}

function parseServer(value: unknown): RemoteRegistryServer | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  const name = stringField(value, "name");
  if (name === undefined) {
    return undefined;
  }
  const repository = isRecord(value.repository) ? value.repository : undefined;
  const repositoryUrl =
    repository === undefined ? undefined : stringField(repository, "url");
  const websiteUrl = stringField(value, "websiteUrl");

  return {
    name,
    description: stringField(value, "description") ?? "",
    version: stringField(value, "version") ?? "",
    ...(repositoryUrl === undefined ? {} : { repositoryUrl }),
    ...(websiteUrl === undefined ? {} : { websiteUrl }),
    packages: compact(arrayField(value, "packages").map(parsePackage)),
    remotes: compact(arrayField(value, "remotes").map(parseTransport)),
  };
}

/**
 * Validate one `ServerResponse` (`{ server, _meta }`) from the registry.
 * Returns `undefined` when it carries no usable server, so a bad record can
 * be skipped without discarding its neighbours.
 */
export function parseRemoteRecord(
  value: unknown,
): RemoteRegistryRecord | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  const server = parseServer(value.server);
  if (server === undefined) {
    return undefined;
  }

  const meta = isRecord(value._meta) ? value._meta : undefined;
  const official = meta !== undefined ? meta[OFFICIAL_META_KEY] : undefined;
  const status = isRecord(official)
    ? stringField(official, "status")
    : undefined;
  const updatedAt = isRecord(official)
    ? stringField(official, "updatedAt")
    : undefined;

  return {
    server,
    ...(status === undefined ? {} : { status }),
    ...(updatedAt === undefined ? {} : { updatedAt }),
  };
}

/**
 * Validate a `ServerList` response (`{ servers, metadata: { nextCursor } }`).
 * Throws when `servers` is not an array, which the caller reports as a
 * malformed registry; individual bad records are skipped.
 */
export function parseRemotePage(value: unknown): RemoteRegistryPage {
  if (!isRecord(value) || !Array.isArray(value.servers)) {
    throw new Error("registry list response has no servers array");
  }
  const metadata = isRecord(value.metadata) ? value.metadata : undefined;
  const nextCursor =
    metadata === undefined ? undefined : stringField(metadata, "nextCursor");

  return {
    records: compact(value.servers.map(parseRemoteRecord)),
    ...(nextCursor === undefined ? {} : { nextCursor }),
  };
}

function toTransportType(type: string): MCPTransportType | undefined {
  switch (type) {
    case "stdio":
      return "stdio";
    case "streamable-http":
      return "http";
    case "sse":
      return "sse";
    default:
      return undefined;
  }
}

/**
 * The `name@version` spec of an `npm` package, or `undefined` when the
 * identifier or version is not a valid npm name or version.
 */
function npmSpecOf(pkg: RemoteRegistryPackage): string | undefined {
  if (
    pkg.registryType !== "npm" ||
    pkg.identifier.length > NPM_PACKAGE_NAME_MAX_LENGTH ||
    !NPM_PACKAGE_NAME.test(pkg.identifier)
  ) {
    return undefined;
  }
  if (pkg.version === undefined) {
    return pkg.identifier;
  }
  return pkg.version.length <= NPM_VERSION_MAX_LENGTH &&
    NPM_VERSION.test(pkg.version)
    ? `${pkg.identifier}@${pkg.version}`
    : undefined;
}

/**
 * Map a registry record to a catalog entry.
 *
 * Remote entries are never `verified`: that flag means "reviewed by NeuroLink"
 * for the built-in catalog, and the registry's contents are the publishers'
 * own claims. Only an `npm` package whose identifier and version are valid
 * npm names gets a runnable `command`; anything else (other package types such
 * as pypi, oci or nuget, or an npm package with a malformed identifier or
 * version) is listed in `metadata.packages` only, for the caller to act on.
 */
export function mapRemoteRecord(
  record: RemoteRegistryRecord,
  apiBase: string,
): McpRegistryEntry {
  const { server } = record;
  const runnable = server.packages
    .map((pkg) => ({ pkg, spec: npmSpecOf(pkg) }))
    .find(
      (candidate): candidate is { pkg: RemoteRegistryPackage; spec: string } =>
        candidate.spec !== undefined,
    );

  const transports = Array.from(
    new Set(
      compact([
        ...server.packages.map((pkg) =>
          pkg.transport === undefined
            ? undefined
            : toTransportType(pkg.transport.type),
        ),
        ...server.remotes.map((remote) => toTransportType(remote.type)),
      ]),
    ),
  );

  const requiredEnvVars =
    runnable === undefined
      ? []
      : runnable.pkg.environmentVariables
          .filter((variable) => variable.isRequired)
          .map((variable) => variable.name);

  const remotes = server.remotes.flatMap((remote) =>
    remote.url === undefined ? [] : [{ type: remote.type, url: remote.url }],
  );

  const metadata: JsonObject = {
    source: "remote-registry",
    registry: apiBase,
    ...(record.status === undefined ? {} : { registryStatus: record.status }),
    packages: server.packages.map((pkg) => ({
      registryType: pkg.registryType,
      identifier: pkg.identifier,
      ...(pkg.version === undefined ? {} : { version: pkg.version }),
    })),
    remotes,
  };

  return {
    id: server.name,
    name: server.name,
    description: server.description,
    version: server.version,
    ...(server.websiteUrl === undefined ? {} : { homepage: server.websiteUrl }),
    ...(server.repositoryUrl === undefined
      ? {}
      : { repository: server.repositoryUrl }),
    ...(runnable === undefined
      ? {}
      : {
          npmPackage: runnable.pkg.identifier,
          command: "npx",
          args: ["-y", runnable.spec],
          installCommand: `npx -y ${runnable.spec}`,
        }),
    ...(requiredEnvVars.length === 0 ? {} : { requiredEnvVars }),
    ...(transports.length === 0 ? {} : { transports }),
    ...(record.updatedAt === undefined
      ? {}
      : { lastUpdated: record.updatedAt }),
    verified: false,
    metadata,
  };
}
