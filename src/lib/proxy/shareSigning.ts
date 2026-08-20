/**
 * The one HMAC used across peer sharing.
 *
 * Leases, receipts and coin notes all need the same thing: a statement one node
 * makes that another can check without being able to forge. They had grown
 * separate copies of the same twenty lines, which is how two of them end up with
 * different canonicalisation and a signature that verifies on one path and not
 * the other.
 *
 * **Why HMAC and not a signature scheme.** The key-distribution problem that
 * asymmetric keys solve does not exist here: every one of these statements
 * passes between exactly two nodes that already share a secret. The package's
 * browser bundle also stubs `node:crypto` down to a subset with no Ed25519 in
 * it, and these modules are reachable from that build.
 *
 * **What that costs.** A MAC proves authorship only to someone holding the key,
 * so a receipt is evidence between the two parties to it and not to a third.
 * Coin notes are built around that limit rather than against it — see
 * `shareNotes.ts`.
 *
 * @module proxy/shareSigning
 */

import { createHmac, randomBytes } from "node:crypto";

/** A secret suitable for keying any of the statements in this subsystem. */
export function generateShareSecret(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * Canonicalise and sign.
 *
 * The payload is serialized with its keys sorted, so two nodes that built the
 * same object in a different order still agree on the bytes being signed.
 */
export function signSharePayload(payload: unknown, secret: string): string {
  return createHmac("sha256", secret)
    .update(canonicalize(payload))
    .digest("base64url");
}

/** Does `signature` match what this secret would produce for this payload? */
export function verifySharePayload(
  payload: unknown,
  signature: string,
  secret: string,
): boolean {
  return secretsMatch(signSharePayload(payload, secret), signature);
}

/**
 * Compare two strings without leaking where they diverge.
 *
 * Hand-rolled rather than `crypto.timingSafeEqual` because that is one of the
 * things the browser bundle's `node:crypto` stub does not carry.
 */
export function secretsMatch(expected: string, presented: string): boolean {
  if (expected.length !== presented.length || expected.length === 0) {
    return false;
  }
  let difference = 0;
  for (let index = 0; index < expected.length; index += 1) {
    difference |= expected.charCodeAt(index) ^ presented.charCodeAt(index);
  }
  return difference === 0;
}

/**
 * Deterministic JSON: object keys sorted at every depth, `undefined` dropped.
 *
 * Array order is meaningful and is left alone.
 */
function canonicalize(value: unknown): string {
  return JSON.stringify(sortDeep(value));
}

function sortDeep(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortDeep);
  }
  if (value === null || typeof value !== "object") {
    return value;
  }
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, entry]) => entry !== undefined)
    .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0));
  return Object.fromEntries(
    entries.map(([key, entry]) => [key, sortDeep(entry)]),
  );
}
