/**
 * URL policy for the network MCP transports (http, sse, websocket).
 *
 * An MCP server URL names where every tool call, and every configured
 * header, is sent. Until this policy existed, nothing checked it: a project
 * config could point a server at `http://169.254.169.254/` or at an
 * attacker's plaintext host and the SDK would connect. The rules, in order:
 *
 *  1. The scheme is one of `https:`, `wss:`, `http:`, `ws:`.
 *  2. A loopback host (`localhost`, `*.localhost`, `127.0.0.0/8`, `::1`) may
 *     use any of the four. Local development servers are the common case
 *     for plaintext and they never leave the machine.
 *  3. Otherwise plaintext is refused, and a host that is — or resolves to —
 *     a private, link-local, CGNAT, multicast or cloud-metadata address is
 *     refused too, so a tool call cannot be turned into a request against
 *     the machine's own network.
 *  4. `allowPrivateNetwork: true` on that server's config lifts rule 3 for
 *     private addresses, and lets plaintext reach them. A public host still
 *     needs TLS.
 *
 * `utils/ssrfGuard.ts` is deliberately not reused: it is HTTPS-only and treats
 * loopback as blocked, which is right for a server fetching an untrusted URL
 * and wrong for a client talking to a local MCP server.
 */

import { lookup } from "node:dns/promises";
import { BlockList, isIP } from "node:net";
import type {
  McpTransportAddressClass,
  McpTransportUrlPolicyOptions,
} from "../types/index.js";

const PLAINTEXT_SCHEMES: ReadonlySet<string> = new Set(["http:", "ws:"]);
const TLS_SCHEMES: ReadonlySet<string> = new Set(["https:", "wss:"]);

const LOOPBACK_ADDRESSES = new BlockList();
LOOPBACK_ADDRESSES.addSubnet("127.0.0.0", 8, "ipv4");
LOOPBACK_ADDRESSES.addAddress("::1", "ipv6");

/**
 * Non-public ranges: RFC 1918, link-local (which holds the AWS/GCP/Azure
 * metadata endpoint), CGNAT (which holds Alibaba's), "this network",
 * protocol assignments, benchmarking, multicast, reserved, and the IPv6
 * unspecified, unique-local and link-local ranges. `BlockList` checks an
 * IPv4-mapped IPv6 address against the IPv4 rules on its own.
 */
const PRIVATE_ADDRESSES = new BlockList();
PRIVATE_ADDRESSES.addSubnet("0.0.0.0", 8, "ipv4");
PRIVATE_ADDRESSES.addSubnet("10.0.0.0", 8, "ipv4");
PRIVATE_ADDRESSES.addSubnet("100.64.0.0", 10, "ipv4");
PRIVATE_ADDRESSES.addSubnet("169.254.0.0", 16, "ipv4");
PRIVATE_ADDRESSES.addSubnet("172.16.0.0", 12, "ipv4");
PRIVATE_ADDRESSES.addSubnet("192.0.0.0", 24, "ipv4");
PRIVATE_ADDRESSES.addSubnet("192.168.0.0", 16, "ipv4");
PRIVATE_ADDRESSES.addSubnet("198.18.0.0", 15, "ipv4");
PRIVATE_ADDRESSES.addSubnet("224.0.0.0", 4, "ipv4");
PRIVATE_ADDRESSES.addSubnet("240.0.0.0", 4, "ipv4");
PRIVATE_ADDRESSES.addAddress("::", "ipv6");
PRIVATE_ADDRESSES.addSubnet("fc00::", 7, "ipv6");
PRIVATE_ADDRESSES.addSubnet("fe80::", 10, "ipv6");

function stripBrackets(host: string): string {
  return host.startsWith("[") && host.endsWith("]") ? host.slice(1, -1) : host;
}

function isLoopbackName(host: string): boolean {
  const name = host.endsWith(".") ? host.slice(0, -1) : host;
  return name === "localhost" || name.endsWith(".localhost");
}

/**
 * Classify one IP literal. Throws when `ip` is not an IP address at all, so a
 * caller never silently treats a host name as public.
 */
export function classifyMcpTransportAddress(
  ip: string,
): McpTransportAddressClass {
  const family = isIP(ip);
  if (family === 0) {
    throw new Error(`"${ip}" is not an IP address`);
  }
  const type = family === 4 ? "ipv4" : "ipv6";
  if (LOOPBACK_ADDRESSES.check(ip, type)) {
    return "loopback";
  }
  if (PRIVATE_ADDRESSES.check(ip, type)) {
    return "private";
  }
  return "public";
}

function describe(options: McpTransportUrlPolicyOptions): string {
  return options.serverId
    ? `MCP server "${options.serverId}" (${options.transport})`
    : `MCP ${options.transport} transport`;
}

async function resolveHostAddresses(host: string): Promise<string[]> {
  const records = await lookup(host, { all: true, verbatim: true });
  return records.map((record) => record.address);
}

/**
 * Enforce the policy described in this module's header on `rawUrl`.
 *
 * Rejection is an `Error` whose message names the rule and, where one
 * applies, the opt-out (`allowPrivateNetwork`). The URL itself is quoted so
 * an operator can find the offending server entry; it never carries
 * credentials, because `headers` are not part of the URL.
 */
export async function assertMcpTransportUrlAllowed(
  rawUrl: string,
  options: McpTransportUrlPolicyOptions,
): Promise<void> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error(`${describe(options)}: "${rawUrl}" is not a valid URL`);
  }

  const scheme = url.protocol;
  const tls = TLS_SCHEMES.has(scheme);
  if (!tls && !PLAINTEXT_SCHEMES.has(scheme)) {
    throw new Error(
      `${describe(options)}: scheme "${scheme}" is not allowed (use https:, wss:, or http:/ws: for a loopback host)`,
    );
  }

  const host = stripBrackets(url.hostname).toLowerCase();
  if (host.length === 0) {
    throw new Error(`${describe(options)}: "${rawUrl}" has no host`);
  }
  // A host-supplied fetch/dispatcher owns the connection (the egress suites
  // pin DNS through exactly such a fetch); judging the hostname here would
  // refuse names only that resolver knows. The scheme check above still ran.
  if (options.hostOwnedEgress === true) {
    return;
  }

  const allowPrivate = options.allowPrivateNetwork === true;

  const literalClass: McpTransportAddressClass | undefined = isLoopbackName(
    host,
  )
    ? "loopback"
    : isIP(host) !== 0
      ? classifyMcpTransportAddress(host)
      : undefined;

  if (literalClass !== undefined) {
    if (literalClass === "loopback") {
      return;
    }
    if (!allowPrivate) {
      if (literalClass === "private") {
        throw new Error(
          `${describe(options)}: "${rawUrl}" points at a private, link-local or metadata address; set "allowPrivateNetwork": true on this server if that is intended`,
        );
      }
      if (!tls) {
        throw new Error(
          `${describe(options)}: "${rawUrl}" uses plaintext ${scheme} to a non-loopback host; use ${scheme === "ws:" ? "wss:" : "https:"}`,
        );
      }
      return;
    }
    if (literalClass === "public" && !tls) {
      throw new Error(
        `${describe(options)}: "${rawUrl}" uses plaintext ${scheme} to a public host; allowPrivateNetwork only permits plaintext to private addresses`,
      );
    }
    return;
  }

  // A host name. Plaintext to anything that is not a loopback literal or
  // `localhost` is refused before any lookup, so a hostile config cannot
  // make the decision depend on what its own DNS answers.
  if (!tls && !allowPrivate) {
    throw new Error(
      `${describe(options)}: "${rawUrl}" uses plaintext ${scheme} to a non-loopback host; use ${scheme === "ws:" ? "wss:" : "https:"}, or set "allowPrivateNetwork": true for a server on your own network`,
    );
  }

  let addresses: string[];
  try {
    addresses = await resolveHostAddresses(host);
  } catch (error) {
    throw new Error(
      `${describe(options)}: host "${host}" could not be resolved (${error instanceof Error ? error.message : String(error)})`,
      { cause: error },
    );
  }
  if (addresses.length === 0) {
    throw new Error(
      `${describe(options)}: host "${host}" resolved to no addresses`,
    );
  }

  const classes = addresses.map((address) => ({
    address,
    cls: classifyMcpTransportAddress(address),
  }));

  if (!allowPrivate) {
    const nonPublic = classes.find((entry) => entry.cls !== "public");
    if (nonPublic) {
      throw new Error(
        `${describe(options)}: host "${host}" resolves to ${nonPublic.address}, a ${nonPublic.cls} address; set "allowPrivateNetwork": true on this server if that is intended`,
      );
    }
    return;
  }

  if (!tls && classes.some((entry) => entry.cls === "public")) {
    throw new Error(
      `${describe(options)}: "${rawUrl}" uses plaintext ${scheme} to a host that resolves to a public address; allowPrivateNetwork only permits plaintext to private addresses`,
    );
  }
}
