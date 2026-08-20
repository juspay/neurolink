/**
 * Transferable coin notes — A issues, B holds, C redeems against A.
 *
 * A grant's coins are bound to the pair that agreed them. A note is not: it is a
 * bearer credit against the issuing node, redeemable by whoever presents it and
 * holds a grant with that node. That is what lets capacity move through a mesh
 * rather than only along the edge it was granted on.
 *
 * **Replay protection is the whole design.** A note is worth exactly one
 * redemption, so the issuer keeps a record of every note it minted and marks it
 * spent under the same lock that credits the balance. Two nodes racing the same
 * note produce one credit and one `spent`.
 *
 * **What a holder can and cannot check.** Notes are signed with an HMAC keyed by
 * a secret only the issuer has, so an intermediate holder cannot verify one
 * offline — it can only ask the issuer, which is what `POST /peer/note` is for.
 * That check is safe to expose because holding the note is itself the
 * credential: the request must carry a note whose signature the issuer accepts,
 * so it tells a stranger nothing they did not already have.
 *
 * An asymmetric signature would let a holder verify without asking. It is not
 * available here — the package's browser bundle stubs `node:crypto` down to a
 * subset with no Ed25519 — and the check-with-the-issuer step has to exist
 * regardless, because a valid signature says nothing about whether the note has
 * already been spent.
 *
 * @module proxy/shareNotes
 */

import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import type {
  ProxyShareNote,
  ProxyShareNoteFile,
  ProxyShareNoteRecord,
  ProxyShareNoteStatus,
} from "../types/index.js";
import { AsyncMutex } from "../utils/asyncMutex.js";
import { creditShareGrantCoins, getOrCreateNoteSecret } from "./shareGrants.js";
import { signSharePayload, verifySharePayload } from "./shareSigning.js";

const NOTES_FILE = "proxy-share-notes.json";

/** Default life of a note. Long enough to hand over, short enough to expire. */
export const DEFAULT_NOTE_TTL_MS = 2_592_000_000;

/** Wire prefix, so a note is never mistaken for a share token. */
export const NOTE_PREFIX = "nln";

/**
 * How long a record outlives the note it tracks.
 *
 * Every mint appends a record and nothing ever removed one, so the file grew
 * for the life of the node. A record past its `notAfter` cannot authorize
 * anything — the note is refused as `expired` — so the only thing the extra
 * retention buys is that a holder presenting a just-lapsed note is told
 * `expired` rather than the more alarming `unknown`. A month of that is plenty.
 */
export const NOTE_RECORD_RETENTION_MS = 2_592_000_000;

let customFilePath: string | null = null;
let notes: Record<string, ProxyShareNoteRecord> = {};
let loaded = false;
const mutationMutex = new AsyncMutex();

export function initShareNotes(filePath: string): void {
  customFilePath = filePath;
  notes = {};
  loaded = false;
}

function getFilePath(): string {
  return customFilePath ?? join(homedir(), ".neurolink", NOTES_FILE);
}

async function ensureLoaded(options: { force?: boolean } = {}): Promise<void> {
  if (loaded && !options.force) {
    return;
  }
  try {
    const parsed = JSON.parse(
      await readFile(getFilePath(), "utf8"),
    ) as Partial<ProxyShareNoteFile>;
    notes = parsed?.notes ?? {};
  } catch {
    notes = {};
  }
  loaded = true;
}

async function persist(): Promise<void> {
  const { writeJsonSnapshotAtomically } =
    await import("./snapshotPersistence.js");
  const file: ProxyShareNoteFile = { schemaVersion: 1, notes };
  await writeJsonSnapshotAtomically(getFilePath(), file);
}

/** Everything the signature covers. */
function notePayload(note: Omit<ProxyShareNote, "signature">) {
  return note;
}

/** Render a note as one line that survives a chat window. */
export function encodeShareNote(note: ProxyShareNote): string {
  return `${NOTE_PREFIX}_${Buffer.from(JSON.stringify(note), "utf8").toString(
    "base64url",
  )}`;
}

/** Read a note back. Returns undefined for anything that is not one of ours. */
export function decodeShareNote(encoded: string): ProxyShareNote | undefined {
  const trimmed = encoded.trim();
  if (!trimmed.startsWith(`${NOTE_PREFIX}_`)) {
    return undefined;
  }
  try {
    const parsed = JSON.parse(
      Buffer.from(trimmed.slice(NOTE_PREFIX.length + 1), "base64url").toString(
        "utf8",
      ),
    ) as Partial<ProxyShareNote>;
    if (
      typeof parsed?.noteId !== "string" ||
      typeof parsed.coins !== "number" ||
      typeof parsed.signature !== "string" ||
      typeof parsed.notAfter !== "number"
    ) {
      return undefined;
    }
    return parsed as ProxyShareNote;
  } catch {
    return undefined;
  }
}

/**
 * Mint a note against this node.
 *
 * The record is written before the note is returned, so a note can never exist
 * that the issuer has no memory of — the case where a crash between the two
 * would leave an unredeemable credit in someone's hands.
 */
export async function issueShareNote(args: {
  issuer: string;
  coins: number;
  ttlMs?: number;
  memo?: string;
  now?: number;
}): Promise<ProxyShareNote> {
  if (!(args.coins > 0)) {
    throw new Error("A note must carry a positive number of coins.");
  }
  const secret = await getOrCreateNoteSecret();
  const now = args.now ?? Date.now();
  const unsigned: Omit<ProxyShareNote, "signature"> = {
    schemaVersion: 1,
    noteId: randomBytes(12).toString("base64url"),
    issuer: args.issuer,
    coins: args.coins,
    issuedAt: now,
    notAfter: now + (args.ttlMs ?? DEFAULT_NOTE_TTL_MS),
    ...(args.memo ? { memo: args.memo } : {}),
  };
  const note: ProxyShareNote = {
    ...unsigned,
    signature: signSharePayload(notePayload(unsigned), secret),
  };
  await mutationMutex.runExclusive(async () => {
    await ensureLoaded({ force: true });
    // Minting is the only thing that grows this file, so it is also where the
    // pruning belongs — no timer, and the cost is paid by the operation that
    // caused it.
    pruneExpiredNotes(now);
    notes[note.noteId] = {
      noteId: note.noteId,
      coins: note.coins,
      issuedAt: note.issuedAt,
      notAfter: note.notAfter,
      ...(note.memo ? { memo: note.memo } : {}),
    };
    await persist();
  });
  return note;
}

/**
 * Drop records for notes that can no longer be redeemed or usefully explained.
 *
 * Must be called under the mutation mutex, by something that persists after.
 */
function pruneExpiredNotes(now: number): void {
  for (const [noteId, record] of Object.entries(notes)) {
    if (record.notAfter + NOTE_RECORD_RETENTION_MS <= now) {
      delete notes[noteId];
    }
  }
}

/**
 * What the issuer makes of a note it is shown.
 *
 * `forged` and `unknown` are kept apart deliberately: the first means the
 * signature does not check out, the second means it does but this node has no
 * record of minting it — which is what a note from a *different* issuer looks
 * like, and is a different thing to tell the holder.
 */
export async function inspectShareNote(
  note: ProxyShareNote,
  secret: string | undefined,
  now: number = Date.now(),
): Promise<{ status: ProxyShareNoteStatus; coins: number }> {
  const { signature, ...unsigned } = note;
  if (!secret || !verifySharePayload(unsigned, signature, secret)) {
    return { status: "forged", coins: 0 };
  }
  await ensureLoaded({ force: true });
  const record = notes[note.noteId];
  if (!record) {
    return { status: "unknown", coins: 0 };
  }
  if (record.redeemedAt !== undefined) {
    return { status: "spent", coins: record.coins };
  }
  if (record.notAfter <= now) {
    return { status: "expired", coins: record.coins };
  }
  return { status: "valid", coins: record.coins };
}

/**
 * Redeem a note into a grant's balance.
 *
 * Marking spent and crediting happen under one lock, so two holders racing the
 * same note produce exactly one credit. The record is marked **before** the
 * credit: a crash between them costs the redeemer the note, which is the safe
 * direction — the alternative is a note that can be redeemed twice.
 */
export async function redeemShareNote(args: {
  note: ProxyShareNote;
  grantId: string;
  secret: string | undefined;
  now?: number;
}): Promise<
  | { ok: true; coins: number; balance: number | undefined }
  | { ok: false; status: ProxyShareNoteStatus }
> {
  const now = args.now ?? Date.now();
  const { signature, ...unsigned } = args.note;
  if (!args.secret || !verifySharePayload(unsigned, signature, args.secret)) {
    return { ok: false, status: "forged" };
  }
  const claimed = await mutationMutex.runExclusive(async () => {
    await ensureLoaded({ force: true });
    const record = notes[args.note.noteId];
    if (!record) {
      return { status: "unknown" as const, coins: 0 };
    }
    if (record.redeemedAt !== undefined) {
      return { status: "spent" as const, coins: record.coins };
    }
    if (record.notAfter <= now) {
      return { status: "expired" as const, coins: record.coins };
    }
    notes[record.noteId] = {
      ...record,
      redeemedAt: now,
      redeemedByGrant: args.grantId,
    };
    await persist();
    return { status: "valid" as const, coins: record.coins };
  });
  if (claimed.status !== "valid") {
    return { ok: false, status: claimed.status };
  }
  const balance = await creditShareGrantCoins(args.grantId, claimed.coins);
  return { ok: true, coins: claimed.coins, balance };
}

/** Every note this node has minted, newest first. */
export async function listShareNotes(): Promise<ProxyShareNoteRecord[]> {
  await ensureLoaded({ force: true });
  return Object.values(notes).sort((a, b) => b.issuedAt - a.issuedAt);
}
