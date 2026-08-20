/**
 * `neurolink proxy share` — the lender's controls.
 *
 * Every mutation here lands in the running proxy without a restart: the grant
 * store re-reads its file when the mtime moves, so `share pause` takes effect on
 * the borrower's next request rather than at the next deploy.
 *
 * @module cli/commands/proxyShare
 */

import type { Argv, CommandModule } from "yargs";
import {
  attachLeaseMaterial,
  createShareGrant,
  getNodePublicUrl,
  setNodePublicUrl,
  deleteShareGrant,
  findShareGrantByPeer,
  initShareGrants,
  listShareGrants,
  rotateShareGrantToken,
  setShareGrantState,
  updateShareGrant,
} from "../../lib/proxy/shareGrants.js";
import {
  resolveProxyGrantsPath,
  resolveProxyLedgerPath,
  resolveProxyPaths,
  resolveProxyNotesPath,
  resolveProxyProvisioningPath,
  resolveProxyReceiptsPath,
  resolveProxyShareAuditPath,
} from "../../lib/proxy/proxyPaths.js";
import {
  initShareLedger,
  summarizeGrantUsage,
} from "../../lib/proxy/shareLedger.js";
import {
  clearAuditDrift,
  getAuditRecord,
  initShareAudit,
} from "../../lib/proxy/shareAudit.js";
import type {
  ProxyPaths,
  ProxyShareArgs,
  ProxyState,
  ProxyShareEntitlement,
  ProxyShareGates,
  ProxyShareGrant,
  ProxyShareLevel,
  ProxySharePresetName,
  ProxyShareWindowSlice,
} from "../../lib/types/index.js";

const ACTIONS = [
  "create",
  "provision",
  "url",
  "list",
  "status",
  "pause",
  "resume",
  "revoke",
  "topup",
  "set",
  "link",
  "rotate",
  "level",
  "note",
  "notes",
  "receipts",
  "delete",
] as const;

/** Parse `7d`, `12h`, `90m` or a bare number of days into milliseconds. */
export function parseDurationMs(value: string): number | undefined {
  const match = /^(\d+(?:\.\d+)?)\s*([smhdw]?)$/i.exec(value.trim());
  if (!match) {
    return undefined;
  }
  const amount = Number(match[1]);
  const unit = (match[2] || "d").toLowerCase();
  const scale: Record<string, number> = {
    s: 1000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
    w: 604_800_000,
  };
  const factor = scale[unit];
  return factor === undefined ? undefined : amount * factor;
}

/**
 * Parse a window-slice expression.
 *
 * Accepts `20` (both windows), or `5h=20,7d=15` to set them apart. Both windows
 * matter: a borrower can be harmless inside any single 5-hour session and still
 * drain the week.
 */
export function parseWindowSlice(
  value: string,
): ProxyShareWindowSlice | undefined {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  if (/^\d+(?:\.\d+)?$/.test(trimmed)) {
    const pct = Number(trimmed);
    return { session5hPct: pct, weekly7dPct: pct };
  }
  const slice: ProxyShareWindowSlice = {};
  for (const part of trimmed.split(",")) {
    const [rawKey, rawValue] = part.split("=");
    if (!rawKey || !rawValue) {
      return undefined;
    }
    const pct = Number(rawValue.trim());
    if (!Number.isFinite(pct)) {
      return undefined;
    }
    const key = rawKey.trim().toLowerCase();
    if (key === "5h" || key === "session") {
      slice.session5hPct = pct;
    } else if (key === "7d" || key === "weekly" || key === "week") {
      slice.weekly7dPct = pct;
    } else {
      return undefined;
    }
  }
  return Object.keys(slice).length > 0 ? slice : undefined;
}

/** Parse `12h<60` / `12h<60@25` — window, utilization threshold, slice cap. */
export function parseSpillover(
  value: string,
): ProxyShareGates["spillover"] | undefined {
  const match =
    /^(\d+(?:\.\d+)?)h?\s*<\s*(\d+(?:\.\d+)?)(?:@(\d+(?:\.\d+)?))?$/i.exec(
      value.trim(),
    );
  if (!match) {
    return undefined;
  }
  return {
    beforeResetHours: Number(match[1]),
    whenUtilizationBelowPct: Number(match[2]),
    ...(match[3] !== undefined ? { maxSlicePct: Number(match[3]) } : {}),
  };
}

/** Parse `21-9` into an hour-of-day admission window. */
export function parseSchedule(
  value: string,
): ProxyShareGates["schedule"] | undefined {
  const match = /^(\d{1,2})\s*-\s*(\d{1,2})$/.exec(value.trim());
  if (!match) {
    return undefined;
  }
  const fromHour = Number(match[1]);
  const toHour = Number(match[2]);
  if (fromHour > 23 || toHour > 23) {
    return undefined;
  }
  return { fromHour, toHour };
}

/** Parse `100/week` or `50/session` into a refill policy. */
export function parseRefill(
  value: string,
): ProxyShareEntitlement["refill"] | undefined {
  const [rawAmount, rawPeriod] = value.split("/");
  const amount = Number(rawAmount?.trim());
  const period = rawPeriod?.trim().toLowerCase();
  if (!Number.isFinite(amount) || amount <= 0) {
    return undefined;
  }
  if (period === "week" || period === "weekly" || period === "7d") {
    return { amount, per: "week" };
  }
  if (period === "session" || period === "5h") {
    return { amount, per: "session" };
  }
  return undefined;
}

/** Parse `20/min` or a bare number into a per-minute request ceiling. */
export function parseRate(value: string): number | undefined {
  const match = /^(\d+)(?:\s*\/\s*min(?:ute)?)?$/i.exec(value.trim());
  return match ? Number(match[1]) : undefined;
}

/**
 * Presets fill the gate set; they are not a separate concept.
 * Every field a preset sets can be overridden by an explicit flag, so
 * `--preset spare --reserve 50` is exactly the preset with a tighter floor.
 */
const PRESETS: Record<
  ProxySharePresetName,
  { gates: ProxyShareGates; ledger: "coins" | "unlimited" }
> = {
  spare: {
    gates: {
      reserveFloor: { session5hPct: 30, weekly7dPct: 30 },
      maxSlice: { session5hPct: 20, weekly7dPct: 20 },
    },
    ledger: "unlimited",
  },
  spillover: {
    gates: {
      spillover: {
        beforeResetHours: 12,
        whenUtilizationBelowPct: 60,
        maxSlicePct: 25,
      },
    },
    ledger: "unlimited",
  },
  metered: {
    gates: { maxSlice: { session5hPct: 25 } },
    ledger: "coins",
  },
  open: {
    // The most permissive preset still carries a rate ceiling. "Open" means no
    // window slice and no ledger, not "hammer the pool as fast as you can" —
    // and a borrower with a runaway loop is the likeliest way an open share
    // costs its lender a window.
    gates: {
      reserveFloor: { session5hPct: 10 },
      rate: { perMinute: 60 },
    },
    ledger: "unlimited",
  },
};

function isPresetName(value: string): value is ProxySharePresetName {
  return (
    value === "spare" ||
    value === "spillover" ||
    value === "metered" ||
    value === "open"
  );
}

/**
 * Build the link a borrower consumes with `peer add --link`.
 *
 * The token rides in the fragment because fragments are not transmitted: a link
 * pasted into anything that resolves the URL leaks the host, never the secret.
 */
export function buildShareLink(
  publicUrl: string,
  token: string,
  receiptSecret?: string,
): string {
  const trimmed = publicUrl.replace(/\/+$/, "");
  const host = trimmed.replace(/^https?:\/\//, "");
  // https is the default, so only a plaintext origin needs to say so. Without
  // this the scheme is lost and a LAN or loopback peer silently becomes an
  // https URL that nothing is listening on.
  const insecure = /^http:\/\//i.test(trimmed);
  // The receipt secret rides in the same fragment as the token: it is no more
  // sensitive, and a borrower without it cannot check a single charge. A "."
  // separates them because neither half's alphabet contains one.
  const fragment = receiptSecret ? `${token}.${receiptSecret}` : token;
  return `neurolink://share/${host}${insecure ? "?scheme=http" : ""}#${fragment}`;
}

/**
 * The gate-only listener port, when the running proxy has one.
 *
 * Read from the proxy's own state rather than derived, because the operator may
 * have moved it with `--share-port` and the answer has to match what is actually
 * listening.
 */
async function readSharePort(): Promise<number | undefined> {
  try {
    const { StateFileManager } = await import("../utils/serverUtils.js");
    const state = new StateFileManager<ProxyState>("proxy-state.json").load();
    return state?.sharePort;
  } catch {
    return undefined;
  }
}

function printToken(
  token: string,
  publicUrl: string | undefined,
  peerLabel: string,
  receiptSecret?: string,
): void {
  console.info("");
  console.info("  Share token (shown once — it is not stored anywhere):");
  console.info(`    ${token}`);
  if (publicUrl) {
    console.info("");
    console.info("  Send the peer this link:");
    console.info(`    ${buildShareLink(publicUrl, token, receiptSecret)}`);
    console.info("");
    console.info("  They add it with:");
    console.info(
      `    neurolink proxy peer add --name <your-name> --link "${buildShareLink(publicUrl, token, receiptSecret)}"`,
    );
  } else {
    console.info("");
    console.info(
      "  Re-run with --public-url <your exposed URL> to get a link the peer can paste.",
    );
    console.info("  Until then they can add it by hand:");
    console.info(
      `    neurolink proxy peer add --name <your-name> --url <your-url> --token ${token}` +
        (receiptSecret ? ` --receipt-secret ${receiptSecret}` : ""),
    );
  }
  void peerLabel;
}

function formatPct(value: number | undefined): string {
  return value === undefined ? "—" : `${value}%`;
}

function describeGates(gates: ProxyShareGates): string[] {
  const lines: string[] = [];
  if (gates.reserveFloor) {
    lines.push(
      `  reserve floor   5h ${formatPct(gates.reserveFloor.session5hPct)}  7d ${formatPct(gates.reserveFloor.weekly7dPct)}`,
    );
  }
  if (gates.maxSlice) {
    lines.push(
      `  max slice       5h ${formatPct(gates.maxSlice.session5hPct)}  7d ${formatPct(gates.maxSlice.weekly7dPct)}  (of the pool)`,
    );
  }
  if (gates.maxSlicePerAccount) {
    lines.push(
      `  per-account cap 5h ${formatPct(gates.maxSlicePerAccount.session5hPct)}  7d ${formatPct(gates.maxSlicePerAccount.weekly7dPct)}`,
    );
  }
  if (gates.spillover) {
    lines.push(
      `  spillover       last ${gates.spillover.beforeResetHours}h when under ${gates.spillover.whenUtilizationBelowPct}%` +
        (gates.spillover.maxSlicePct !== undefined
          ? ` (cap ${gates.spillover.maxSlicePct}%)`
          : ""),
    );
  }
  if (gates.models?.length) {
    lines.push(`  models          ${gates.models.join(", ")}`);
  }
  if (gates.accounts?.length) {
    lines.push(`  accounts        ${gates.accounts.join(", ")}`);
  }
  if (gates.rate) {
    const parts: string[] = [];
    if (gates.rate.perMinute !== undefined) {
      parts.push(`${gates.rate.perMinute}/min`);
    }
    if (gates.rate.concurrency !== undefined) {
      parts.push(`${gates.rate.concurrency} concurrent`);
    }
    lines.push(`  rate            ${parts.join(", ")}`);
  }
  if (gates.schedule) {
    lines.push(
      `  schedule        ${String(gates.schedule.fromHour).padStart(2, "0")}:00–${String(gates.schedule.toHour).padStart(2, "0")}:00 local`,
    );
  }
  if (gates.notAfter !== undefined) {
    lines.push(`  expires         ${new Date(gates.notAfter).toISOString()}`);
  }
  return lines;
}

function describeGrant(grant: ProxyShareGrant): string {
  const entitlement =
    grant.entitlement.ledger === "coins"
      ? `${Math.floor(grant.entitlement.coins ?? 0)} coins`
      : "unlimited";
  const refill = grant.entitlement.refill
    ? ` (+${grant.entitlement.refill.amount}/${grant.entitlement.refill.per})`
    : "";
  const lines = [
    `${grant.peerLabel}  [${grant.id}]`,
    `  level           ${grant.level}`,
    `  state           ${grant.state}`,
    `  entitlement     ${entitlement}${refill}`,
    ...describeGates(grant.gates),
  ];
  if (grant.lastUsedAt) {
    lines.push(`  last used       ${new Date(grant.lastUsedAt).toISOString()}`);
  }
  return lines.join("\n");
}

/**
 * Collect gate overrides from the flags actually supplied.
 * Returns `undefined` for anything unset so a `set` never silently clears a
 * control the operator did not mention.
 */
function gatesFromArgs(argv: ProxyShareArgs): {
  gates: ProxyShareGates;
  errors: string[];
} {
  const gates: ProxyShareGates = {};
  const errors: string[] = [];

  if (argv.reserve !== undefined) {
    const parsed = parseWindowSlice(argv.reserve);
    if (!parsed) {
      errors.push(
        `--reserve: cannot parse "${argv.reserve}" (try 30 or 5h=30,7d=20)`,
      );
    } else {
      gates.reserveFloor = parsed;
    }
  }
  if (argv.maxSlicePerAccount !== undefined) {
    const parsed = parseWindowSlice(argv.maxSlicePerAccount);
    if (!parsed) {
      errors.push(
        `--max-slice-per-account: cannot parse "${argv.maxSlicePerAccount}"`,
      );
    } else {
      gates.maxSlicePerAccount = parsed;
    }
  }
  if (argv.maxSlice !== undefined) {
    const parsed = parseWindowSlice(argv.maxSlice);
    if (!parsed) {
      errors.push(
        `--max-slice: cannot parse "${argv.maxSlice}" (try 20 or 5h=20,7d=15)`,
      );
    } else {
      gates.maxSlice = parsed;
    }
  }
  if (argv.spillover !== undefined) {
    const parsed = parseSpillover(argv.spillover);
    if (!parsed) {
      errors.push(
        `--spillover: cannot parse "${argv.spillover}" (try 12h<60@25)`,
      );
    } else {
      gates.spillover = parsed;
    }
  }
  if (argv.models?.length) {
    gates.models = argv.models;
  }
  if (argv.accounts?.length) {
    gates.accounts = argv.accounts;
  }
  if (argv.rate !== undefined || argv.concurrency !== undefined) {
    const rate: NonNullable<ProxyShareGates["rate"]> = {};
    if (argv.rate !== undefined) {
      const parsed = parseRate(argv.rate);
      if (parsed === undefined) {
        errors.push(`--rate: cannot parse "${argv.rate}" (try 20/min)`);
      } else {
        rate.perMinute = parsed;
      }
    }
    if (argv.concurrency !== undefined) {
      rate.concurrency = argv.concurrency;
    }
    if (Object.keys(rate).length > 0) {
      gates.rate = rate;
    }
  }
  if (argv.schedule !== undefined) {
    const parsed = parseSchedule(argv.schedule);
    if (!parsed) {
      errors.push(`--schedule: cannot parse "${argv.schedule}" (try 21-9)`);
    } else {
      gates.schedule = parsed;
    }
  }
  if (argv.expires !== undefined) {
    const ms = parseDurationMs(argv.expires);
    if (ms === undefined) {
      errors.push(`--expires: cannot parse "${argv.expires}" (try 7d or 48h)`);
    } else {
      gates.notAfter = Date.now() + ms;
    }
  }

  return { gates, errors };
}

async function resolvePeerOrFail(
  peer: string | undefined,
): Promise<ProxyShareGrant> {
  if (!peer) {
    throw new Error("A peer name or grant id is required for this action.");
  }
  const grant = await findShareGrantByPeer(peer);
  if (!grant) {
    throw new Error(`No share grant found for "${peer}".`);
  }
  return grant;
}

/**
 * `share create` — mint a grant and print its one-time token.
 *
 * The token is shown here and never again: nothing stores it, so a lost link is
 * replaced by `share rotate`, not reprinted.
 */
async function handleShareCreate(
  argv: ProxyShareArgs,
  publicUrl: string | undefined,
): Promise<void> {
  if (!argv.peer) {
    throw new Error("--peer is required to create a share grant.");
  }
  const presetName = argv.preset ?? "spare";
  if (!isPresetName(presetName)) {
    throw new Error(
      `Unknown preset "${presetName}". Use spare, spillover, metered or open.`,
    );
  }
  const preset = PRESETS[presetName];
  const { gates: overrides, errors } = gatesFromArgs(argv);
  if (errors.length > 0) {
    throw new Error(errors.join("\n"));
  }
  const level: ProxyShareLevel =
    argv.level === "complete" ? "complete" : "live";
  const ledger =
    argv.ledger === "coins" || argv.coins !== undefined
      ? "coins"
      : argv.ledger === "unlimited"
        ? "unlimited"
        : preset.ledger;
  const entitlement: ProxyShareEntitlement = { ledger };
  if (ledger === "coins") {
    entitlement.coins = argv.coins ?? 0;
  }
  if (argv.refill) {
    const refill = parseRefill(argv.refill);
    if (!refill) {
      throw new Error(
        `--refill: cannot parse "${argv.refill}" (try 100/week or 50/session)`,
      );
    }
    entitlement.refill = refill;
  }

  const issued = await createShareGrant({
    peerLabel: argv.peer,
    level,
    entitlement,
    gates: { ...preset.gates, ...overrides },
    ...(argv.note ? { note: argv.note } : {}),
  });

  if (argv.json) {
    console.info(
      JSON.stringify({ grant: issued.grant, token: issued.token }, null, 2),
    );
    return;
  }

  console.info(describeGrant(issued.grant));
  printToken(
    issued.token,
    publicUrl,
    issued.grant.peerLabel,
    issued.grant.receiptSecret,
  );

  // The gate-only listener comes up on the first active grant, so this is
  // exactly the moment an operator needs to know which port to expose —
  // and that their own client keeps using the main one.
  const sharePort = await readSharePort();
  console.info("");
  if (sharePort !== undefined) {
    console.info(`  Peers connect on the share listener, port ${sharePort}.`);
    console.info(
      "  It refuses any request without a token, so expose that port — not the",
    );
    console.info("  main one, which still serves your own client untokened.");
  } else {
    console.info(
      "  The gate-only share listener starts within a few seconds of this grant,",
    );
    console.info(
      "  on your proxy port + 1. Expose that port; `neurolink proxy expose` picks",
    );
    console.info("  it automatically.");
  }
  console.info("");
  console.info(
    "  Note: sharing subscription capacity with other people is likely outside",
  );
  console.info(
    "  your provider's consumer terms, and the account carrying the traffic is",
  );
  console.info("  the one exposed. Share deliberately.");
  return;
}

/** `share status` — spend, reach and audit standing, per grant. */
async function handleShareStatus(argv: ProxyShareArgs): Promise<void> {
  const grants = argv.peer
    ? [await resolvePeerOrFail(argv.peer)]
    : await listShareGrants();
  const withUsage = await Promise.all(
    grants.map(async (grant) => ({
      grant,
      usage: await summarizeGrantUsage(grant.id),
      audit: await getAuditRecord(grant.id),
    })),
  );
  if (argv.json) {
    console.info(JSON.stringify(withUsage, null, 2));
    return;
  }
  if (withUsage.length === 0) {
    console.info("No share grants issued.");
    return;
  }
  for (const { grant, usage, audit } of withUsage) {
    console.info(describeGrant(grant));
    console.info(
      `  spent           ${usage.coinsSpent.toFixed(1)} coins over ${usage.requests} request(s)`,
    );
    if (usage.accounts > 0) {
      console.info(`  drew on         ${usage.accounts} account(s)`);
    }
    if (grant.level === "complete") {
      // Spend on a complete share is the borrower's own word. Show what the
      // account's real usage makes of it so the two are never confused.
      const verdict = audit?.autoPausedAt
        ? `auto-paused on usage drift ${new Date(audit.autoPausedAt).toISOString()}`
        : audit && audit.driftStreak > 0
          ? `drifting (${audit.driftStreak} consecutive)`
          : audit?.lastObservation
            ? "consistent with the account's own usage"
            : "no check-in observed yet";
      console.info(`  audit           ${verdict}`);
      if (audit?.lastDriftDetail && audit.driftStreak > 0) {
        console.info(`                  ${audit.lastDriftDetail}`);
      }
    }
    console.info("");
  }
  return;
}

/** `share note` — mint a bearer coin note against this node. */
async function handleShareNote(
  argv: ProxyShareArgs,
  paths: ProxyPaths,
  publicUrl: string | undefined,
): Promise<void> {
  const { initShareNotes, issueShareNote, encodeShareNote } =
    await import("../../lib/proxy/shareNotes.js");
  initShareNotes(resolveProxyNotesPath(paths));
  if (argv.coins === undefined || argv.coins <= 0) {
    throw new Error("--coins is required, and must be positive.");
  }
  const ttlMs = argv.ttl ? parseDurationMs(argv.ttl) : undefined;
  if (argv.ttl && ttlMs === undefined) {
    throw new Error(`--ttl: cannot parse "${argv.ttl}" (try 30d or 48h)`);
  }
  const note = await issueShareNote({
    issuer: publicUrl ?? "this node",
    coins: argv.coins,
    ...(ttlMs !== undefined ? { ttlMs } : {}),
    ...(argv.memo ? { memo: argv.memo } : {}),
  });
  const encoded = encodeShareNote(note);
  if (argv.json) {
    console.info(JSON.stringify({ note, encoded }, null, 2));
    return;
  }
  console.info(`Minted a ${argv.coins}-coin note against this node.`);
  console.info("");
  console.info(`    ${encoded}`);
  console.info("");
  console.info(
    `  Redeemable once, by whoever holds it, until ${new Date(note.notAfter).toISOString()}.`,
  );
  console.info("  They need a grant with you to redeem it into:");
  console.info(
    "    neurolink proxy peer redeem --name <you> --coin-note <the note>",
  );
  console.info(
    "  Anyone holding it can check it without spending it, with --check.",
  );
  return;
}

/** `share notes` — what this node has minted, and whether it was redeemed. */
async function handleShareNotes(
  argv: ProxyShareArgs,
  paths: ProxyPaths,
): Promise<void> {
  const { initShareNotes, listShareNotes } =
    await import("../../lib/proxy/shareNotes.js");
  initShareNotes(resolveProxyNotesPath(paths));
  const minted = await listShareNotes();
  if (argv.json) {
    console.info(JSON.stringify(minted, null, 2));
    return;
  }
  if (minted.length === 0) {
    console.info("No coin notes minted.");
    return;
  }
  const now = Date.now();
  for (const record of minted) {
    const state = record.redeemedAt
      ? `redeemed ${new Date(record.redeemedAt).toISOString()}`
      : record.notAfter <= now
        ? "expired"
        : `valid until ${new Date(record.notAfter).toISOString()}`;
    console.info(
      `${record.noteId}  ${String(record.coins).padStart(6)} coins  ${state}${
        record.memo ? `  — ${record.memo}` : ""
      }`,
    );
  }
  return;
}

/**
 * `share provision` — authorize a borrower's own credential.
 *
 * Split PKCE: the borrower holds the verifier, so the code relayed through here
 * is worthless to the lender and to anyone who intercepts it.
 */
async function handleShareProvision(
  argv: ProxyShareArgs,
  paths: ProxyPaths,
  publicUrl: string | undefined,
): Promise<void> {
  const grant = await resolvePeerOrFail(argv.peer);
  const { generateLeaseSecret } = await import("../../lib/proxy/shareLease.js");
  const {
    authorizeProvisionRequest,
    getProvisionRequest,
    initShareProvisioning,
  } = await import("../../lib/proxy/shareProvisioning.js");
  initShareProvisioning(resolveProxyProvisioningPath(paths));

  // The borrower goes first. Its verifier is the only thing that can turn
  // the code this command produces into a credential, so there is nothing
  // to authorize until it has lodged the matching challenge.
  const pending = await getProvisionRequest(grant.id);
  if (!pending) {
    throw new Error(
      `${grant.peerLabel} has not asked to be provisioned yet.\n` +
        "  On their machine, with your share token already added:\n" +
        "    neurolink proxy peer request --name <your-name>\n" +
        "  Then run this command again. Their request is valid for 15 minutes.",
    );
  }

  const leasePolicy = {
    ttlMs: parseDurationMs(argv.leaseTtl ?? "7d") ?? 604_800_000,
    heartbeatEveryMs: parseDurationMs(argv.heartbeat ?? "15m") ?? 900_000,
    offlineGraceMs: parseDurationMs(argv.offlineGrace ?? "24h") ?? 86_400_000,
  };
  const prepared = await updateShareGrant(grant.id, { level: "complete" });
  if (!prepared) {
    throw new Error(`No share grant found for "${argv.peer}".`);
  }
  // Which of the lender's accounts this credential is minted from. The
  // drift audit compares that account's real utilization against what the
  // borrower reports, so without it complete mode has reporting but no
  // verification.
  const fromAccount = argv.fromAccount ?? prepared.gates.accounts?.[0];
  const withLease = await attachLeaseMaterial(
    prepared.id,
    prepared.leaseSecret ?? generateLeaseSecret(),
    leasePolicy,
    fromAccount,
  );
  if (!withLease) {
    throw new Error("Could not prepare the grant for provisioning.");
  }

  console.info(
    `Authorizing an independent credential for ${withLease.peerLabel}.`,
  );
  console.info("");
  console.info(
    "  This runs a SEPARATE authorization on your account — it does not copy",
  );
  console.info(
    "  your own tokens. Copying them would put two devices on one rotating",
  );
  console.info(
    "  refresh chain, and the loser of that race gets disabled — yours.",
  );
  console.info("");
  console.info(
    "  You will never hold a token for this credential. The borrower keeps",
  );
  console.info(
    "  the PKCE verifier; you only relay a code that is worthless without it.",
  );
  console.info("");
  console.info(
    `  Once provisioned, ${withLease.peerLabel} calls the provider directly. You keep`,
  );
  console.info(
    `  control through the lease: they stop ${argv.offlineGrace ?? "24h"} after you become`,
  );
  console.info(
    "  unreachable, immediately once a heartbeat reaches them, and at the",
  );
  console.info("  lease's hard expiry regardless.");
  console.info("");
  console.info(
    "  Note: a credential on someone else's machine can be extracted by them.",
  );
  console.info(
    "  Complete sharing is enforced cooperatively and audited after the fact —",
  );
  console.info("  use it for people you would trust with the account.");
  console.info("");

  const { buildSubscriptionAuthUrl } =
    await import("../../lib/auth/anthropicOAuth.js");
  const authUrl = buildSubscriptionAuthUrl({
    codeChallenge: pending.codeChallenge,
    state: pending.state,
  });

  console.info("  Open this URL, sign in, and authorize:");
  console.info("");
  console.info(`    ${authUrl}`);
  console.info("");
  console.info("  Anthropic then shows an authorization code. Paste it back:");
  console.info("");
  console.info(
    `    neurolink proxy share provision --peer ${withLease.peerLabel} --code <code>`,
  );

  if (!argv.code) {
    console.info("");
    console.info(
      "  Nothing has been authorized yet — re-run with --code to finish.",
    );
    return;
  }

  // Anthropic renders the code as `code#state`. Only the code half is ours
  // to relay; the state came from the borrower and is already on file.
  const code = argv.code.trim().split("#")[0];
  const authorized = await authorizeProvisionRequest({
    grantId: withLease.id,
    code,
    ...(fromAccount ? { accountLabel: fromAccount } : {}),
  });
  if (!authorized.ok) {
    throw new Error(`Could not record that code: ${authorized.reason}`);
  }
  console.info("");
  console.info(`Authorized. ${withLease.peerLabel} can collect it now:`);
  console.info("");
  console.info("    neurolink proxy peer request --name <your-name> --claim");
  console.info("");
  console.info(
    "  The code is single-use and expires with their request. If they miss",
  );
  console.info("  the window, they ask again and you authorize again.");
  if (!publicUrl) {
    console.info("");
    console.info(
      "  No public URL is recorded, so the lease will carry no heartbeat",
    );
    console.info(
      "  address and they will stop at the offline grace. Set one with:",
    );
    console.info("    neurolink proxy share url https://your-proxy");
  }
  return;
}

/** `share url` — read, set or clear the address links are minted against. */
async function handleShareUrl(argv: ProxyShareArgs): Promise<void> {
  const positional = argv.value?.trim();

  if (argv.clear || positional === "clear") {
    await setNodePublicUrl(undefined);
    console.info(
      "Public URL cleared. Share links now need an explicit --public-url.",
    );
    return;
  }

  // `get` prints the bare value and nothing else, so it can be captured in
  // a shell variable without post-processing. Absent means empty output and
  // a non-zero exit, which is what a script expects.
  if (positional === "get") {
    const current = await getNodePublicUrl();
    if (!current) {
      process.exitCode = 1;
      return;
    }
    console.info(current);
    return;
  }

  const target =
    positional && positional !== "show" ? positional : argv.publicUrl;
  if (!target) {
    const current = await getNodePublicUrl();
    console.info(
      current
        ? `This node is shared at ${current}`
        : "No public URL recorded. Set one with: neurolink proxy share url https://proxy.example.com",
    );
    return;
  }
  await setNodePublicUrl(target);
  console.info(`Share links will be minted against ${target}`);
  const { probeProxyGate } = await import("./proxyExpose.js");
  try {
    const parsed = new URL(target);
    const port = Number(
      parsed.port || (parsed.protocol === "https:" ? 443 : 80),
    );
    const probe = await probeProxyGate(
      parsed.hostname,
      port,
      parsed.protocol === "https:" ? "https" : "http",
    );
    if (probe.reachable && !probe.gated) {
      console.info("");
      console.info(
        "  ⚠ That address served a request carrying no share token.",
      );
      console.info(
        "  Anyone who finds it can spend your subscription. Point that address",
      );
      console.info(
        "  at the gate-only share listener instead — it refuses every untokened",
      );
      console.info("  request, and your own client keeps using the main port:");
      const sharePort = await readSharePort();
      console.info(
        sharePort !== undefined
          ? `    port ${sharePort} on this machine`
          : "    your proxy port + 1, once at least one grant is active",
      );
      console.info("");
      console.info(
        "  Or gate this port itself, which also refuses your own client:",
      );
      console.info("    NEUROLINK_PROXY_REQUIRE_GRANT=1 neurolink proxy start");
    }
  } catch {
    // A URL we cannot probe is not an error — it may not be up yet.
  }
  return;
}

async function runShareCommand(argv: ProxyShareArgs): Promise<void> {
  const paths = resolveProxyPaths(argv.dev ?? false);
  initShareGrants(resolveProxyGrantsPath(paths));
  initShareLedger(resolveProxyLedgerPath(paths));
  initShareAudit(resolveProxyShareAuditPath(paths));
  // An explicit flag wins; otherwise use whatever address this node was told it
  // lives at. Most operators front the proxy with a domain they already own,
  // and retyping it on every mint is how share links go stale.
  const publicUrl = argv.publicUrl ?? (await getNodePublicUrl());

  switch (argv.action) {
    case "create":
      await handleShareCreate(argv, publicUrl);
      return;

    case "list": {
      const grants = await listShareGrants();
      if (argv.json) {
        console.info(JSON.stringify(grants, null, 2));
        return;
      }
      if (grants.length === 0) {
        console.info("No share grants issued.");
        return;
      }
      for (const grant of grants) {
        console.info(describeGrant(grant));
        console.info("");
      }
      return;
    }

    case "status":
      await handleShareStatus(argv);
      return;

    case "pause":
    case "resume": {
      const grant = await resolvePeerOrFail(argv.peer);
      const nextState = argv.action === "pause" ? "paused" : "active";
      const updated = await setShareGrantState(grant.id, nextState);
      if (nextState === "active") {
        // A grant the drift audit paused carries a marker that stops it firing
        // twice. Resuming without clearing it would leave the audit permanently
        // disarmed for this grant, which is the opposite of what resume means.
        await clearAuditDrift(grant.id);
      }
      console.info(
        `${updated?.peerLabel ?? grant.peerLabel} is now ${nextState}. ` +
          "Takes effect on the borrower's next request.",
      );
      return;
    }

    case "revoke": {
      const grant = await resolvePeerOrFail(argv.peer);
      await setShareGrantState(grant.id, "revoked");
      console.info(
        `${grant.peerLabel} revoked. The token no longer serves traffic.`,
      );
      if (grant.level === "complete") {
        console.info(
          "  This grant is complete-level: the borrower holds a credential on your",
        );
        console.info(
          "  account. Revocation stops the lease at their next heartbeat and at",
        );
        console.info(
          "  lease expiry — it does not reach out and delete the credential.",
        );
      }
      return;
    }

    case "note":
      await handleShareNote(argv, paths, publicUrl);
      return;

    case "notes":
      await handleShareNotes(argv, paths);
      return;

    case "receipts": {
      const { initShareReceipts, listShareReceipts, nettedCoinsFor } =
        await import("../../lib/proxy/shareReceipts.js");
      initShareReceipts(resolveProxyReceiptsPath(paths));
      const grant = await resolvePeerOrFail(argv.peer);
      const issuedReceipts = await listShareReceipts(grant.id);
      const forgiven = await nettedCoinsFor(grant.id);
      if (argv.json) {
        console.info(
          JSON.stringify(
            { receipts: issuedReceipts, netted: forgiven },
            null,
            2,
          ),
        );
        return;
      }
      if (issuedReceipts.length === 0) {
        console.info(`No receipts issued to ${grant.peerLabel} yet.`);
        return;
      }
      const charged = issuedReceipts.reduce(
        (sum, receipt) => sum + receipt.coins,
        0,
      );
      console.info(
        `${grant.peerLabel}: ${issuedReceipts.length} receipt(s), ${charged.toFixed(1)} coins charged`,
      );
      if (forgiven > 0) {
        console.info(
          `  ${forgiven.toFixed(1)} coins forgiven by reciprocal netting`,
        );
      }
      for (const receipt of issuedReceipts.slice(-10)) {
        console.info(
          `  #${String(receipt.sequence).padStart(4)}  ${receipt.coins.toFixed(2).padStart(8)} coins  ${
            receipt.model ?? "unknown model"
          }  ${new Date(receipt.settledAt).toISOString()}`,
        );
      }
      return;
    }

    case "delete": {
      const grant = await resolvePeerOrFail(argv.peer);
      const deleted = await deleteShareGrant(grant.id);
      // The audit trail is keyed by grant id and would otherwise outlive the
      // grant it describes, forever.
      const { clearAuditRecord } =
        await import("../../lib/proxy/shareAudit.js");
      await clearAuditRecord(grant.id);
      // An outstanding challenge outliving its grant would still be claimable
      // by whoever holds the now-dead token, so it goes with it.
      const { clearProvisionRequest, initShareProvisioning } =
        await import("../../lib/proxy/shareProvisioning.js");
      initShareProvisioning(resolveProxyProvisioningPath(paths));
      await clearProvisionRequest(grant.id);
      const { clearShareReceipts, initShareReceipts } =
        await import("../../lib/proxy/shareReceipts.js");
      initShareReceipts(resolveProxyReceiptsPath(paths));
      await clearShareReceipts(grant.id);
      console.info(
        deleted
          ? `${grant.peerLabel} deleted.`
          : `${grant.peerLabel} was already gone.`,
      );
      return;
    }

    case "rotate": {
      const grant = await resolvePeerOrFail(argv.peer);
      const issued = await rotateShareGrantToken(grant.id);
      if (!issued) {
        throw new Error(`No share grant found for "${argv.peer}".`);
      }
      console.info(
        `${grant.peerLabel} token rotated. The previous token is dead.`,
      );
      printToken(
        issued.token,
        publicUrl,
        grant.peerLabel,
        issued.grant.receiptSecret,
      );
      return;
    }

    case "topup": {
      const grant = await resolvePeerOrFail(argv.peer);
      if (argv.coins === undefined) {
        throw new Error("--coins is required for topup.");
      }
      // An unlimited grant has no balance to add to, and writing `ledger:
      // "coins"` here would quietly meter a peer the operator had deliberately
      // left unmetered. Changing the ledger is `set`'s job, and it says so.
      if (grant.entitlement.ledger !== "coins") {
        throw new Error(
          `${grant.peerLabel} is an unlimited grant — there is no balance to top up.\n` +
            "  To start metering it instead:\n" +
            `    neurolink proxy share set --peer ${grant.peerLabel} --coins ${argv.coins}`,
        );
      }
      const balance = Math.max(0, (grant.entitlement.coins ?? 0) + argv.coins);
      const updated = await updateShareGrant(grant.id, {
        entitlement: { ledger: "coins", coins: balance },
      });
      console.info(
        `${grant.peerLabel} balance is now ${Math.floor(updated?.entitlement.coins ?? balance)} coins.`,
      );
      return;
    }

    case "set": {
      const grant = await resolvePeerOrFail(argv.peer);
      const { gates, errors } = gatesFromArgs(argv);
      if (errors.length > 0) {
        throw new Error(errors.join("\n"));
      }
      const entitlement: Partial<ProxyShareEntitlement> = {};
      if (argv.ledger === "coins" || argv.ledger === "unlimited") {
        entitlement.ledger = argv.ledger;
      }
      if (argv.coins !== undefined) {
        entitlement.ledger = "coins";
        entitlement.coins = Math.max(0, argv.coins);
      }
      if (argv.refill !== undefined) {
        const refill = parseRefill(argv.refill);
        if (!refill) {
          throw new Error(`--refill: cannot parse "${argv.refill}"`);
        }
        entitlement.refill = refill;
      }
      const updated = await updateShareGrant(grant.id, {
        ...(Object.keys(gates).length > 0 ? { gates } : {}),
        ...(Object.keys(entitlement).length > 0 ? { entitlement } : {}),
      });
      console.info(updated ? describeGrant(updated) : "No change.");
      return;
    }

    case "provision":
      await handleShareProvision(argv, paths, publicUrl);
      return;

    case "url":
      await handleShareUrl(argv);
      return;

    case "level": {
      const grant = await resolvePeerOrFail(argv.peer);
      const target = argv.to;
      if (target !== "live" && target !== "complete") {
        throw new Error("--to must be live or complete.");
      }
      const updated = await updateShareGrant(grant.id, { level: target });
      if (!updated) {
        throw new Error(`Could not change the level for "${argv.peer}".`);
      }
      console.info(`${grant.peerLabel} is now a ${target} share.`);
      if (target === "complete") {
        console.info(
          "  Run `neurolink proxy share provision --peer " +
            `${grant.peerLabel}\` to mint the borrower's own credential.`,
        );
      }
      return;
    }

    case "link": {
      const grant = await resolvePeerOrFail(argv.peer);
      // Nothing stores the token, by design — so a link genuinely cannot be
      // reprinted. Rotating is the honest answer, and it also invalidates
      // whatever copy went missing.
      console.info(
        `Tokens are never stored, so a link cannot be reprinted for ${grant.peerLabel}.`,
      );
      console.info(
        `  neurolink proxy share rotate --peer ${grant.peerLabel}` +
          (publicUrl ? "" : " --public-url <your-url>"),
      );
      return;
    }

    default:
      throw new Error(`Unknown share action: ${String(argv.action)}`);
  }
}

export const proxyShareCommand: CommandModule<object, ProxyShareArgs> = {
  command: "share <action> [value]",
  describe: "Lend pool capacity to a peer and control how much they may take",
  builder: (yargs: Argv) =>
    yargs
      .positional("action", {
        type: "string",
        choices: [...ACTIONS],
        describe: "Share action",
      })
      .positional("value", {
        type: "string",
        describe: "Action argument, e.g. the URL for `share url`",
      })
      .option("peer", {
        type: "string",
        description: "Peer name or grant id",
      })
      .option("level", {
        type: "string",
        choices: ["live", "complete"],
        description:
          "live = borrower proxies through you; complete = borrower holds its own credential on your account",
      })
      .option("preset", {
        type: "string",
        choices: ["spare", "spillover", "metered", "open"],
        description: "Starting gate set; individual flags override it",
      })
      .option("ledger", {
        type: "string",
        choices: ["coins", "unlimited"],
        description: "Metered against a coin balance, or uncapped",
      })
      .option("coins", {
        type: "number",
        description: "Coin balance to set (create/set) or add (topup)",
      })
      .option("refill", {
        type: "string",
        description: "Standing allowance, e.g. 100/week or 50/session",
      })
      .option("max-slice", {
        type: "string",
        alias: "maxSlice",
        description:
          "Hard ceiling as a share of each window: 20, or 5h=20,7d=15",
      })
      .option("max-slice-per-account", {
        type: "string",
        alias: "maxSlicePerAccount",
        description:
          "Ceiling applied to each account independently, instead of the pool",
      })
      .option("reserve", {
        type: "string",
        description: "Headroom you keep for yourself: 30, or 5h=30,7d=20",
      })
      .option("spillover", {
        type: "string",
        description: "Lend only near a reset when little was used: 12h<60@25",
      })
      .option("models", {
        type: "string",
        array: true,
        description: "Model tiers this peer may use, e.g. sonnet haiku",
      })
      .option("accounts", {
        type: "string",
        array: true,
        description: "Which of your accounts are lendable under this grant",
      })
      .option("rate", {
        type: "string",
        description: "Request ceiling, e.g. 20/min",
      })
      .option("concurrency", {
        type: "number",
        description: "Maximum concurrent borrowed requests",
      })
      .option("schedule", {
        type: "string",
        description: "Hours this share is open, e.g. 21-9",
      })
      .option("expires", {
        type: "string",
        description: "Grant lifetime, e.g. 7d or 48h",
      })
      .option("note", {
        type: "string",
        description: "Free-text note kept with the grant",
      })
      .option("to", {
        type: "string",
        choices: ["live", "complete"],
        description: "Target level for `share level`",
      })
      .option("from-account", {
        type: "string",
        alias: "fromAccount",
        description:
          "Which of your accounts the complete share draws on (enables drift auditing)",
      })
      .option("clear", {
        type: "boolean",
        default: false,
        description: "With `share url`: forget the recorded public address",
      })
      .option("code", {
        type: "string",
        description:
          "Authorization code from your browser, to finish `share provision`",
      })
      .option("ttl", {
        type: "string",
        description: "With `share note`: how long the note stays redeemable",
      })
      .option("memo", {
        type: "string",
        description: "With `share note`: a note carried on the coin note",
      })
      .option("offline-grace", {
        type: "string",
        alias: "offlineGrace",
        description:
          "How long a complete-share borrower may run unheard-from (default 24h)",
      })
      .option("heartbeat", {
        type: "string",
        description: "Complete-share check-in interval (default 15m)",
      })
      .option("lease-ttl", {
        type: "string",
        alias: "leaseTtl",
        description: "Complete-share lease lifetime (default 7d)",
      })
      .option("public-url", {
        type: "string",
        alias: "publicUrl",
        description:
          "Public URL for this node; defaults to the one saved by `share url`",
      })
      .option("json", {
        type: "boolean",
        default: false,
        description: "Emit JSON instead of formatted text",
      })
      .option("dev", {
        type: "boolean",
        default: false,
        description: "Use the isolated dev-mode state directory",
      }),
  handler: async (argv) => {
    try {
      await runShareCommand(argv);
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    }
  },
};
