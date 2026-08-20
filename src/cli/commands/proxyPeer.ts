/**
 * `neurolink proxy peer` — the borrower's controls.
 *
 * A peer is a lender's exposed proxy plus the share token they issued. Peers are
 * only consulted after every local account is spent, so adding one can never
 * make this node spend someone else's capacity while it still has its own.
 *
 * @module cli/commands/proxyPeer
 */

import { createHash, randomBytes } from "node:crypto";
import type { Argv, CommandModule } from "yargs";
import {
  addPeer,
  getPeer,
  listPeers,
  removePeer,
  setPeerEnabled,
  updatePeer,
} from "../../lib/proxy/peerStore.js";
import {
  resolveProxyPaths,
  resolveProxyPeersPath,
} from "../../lib/proxy/proxyPaths.js";
import type {
  ProxyPeer,
  ProxyPeerArgs,
  ProxyShareLease,
  ProxyShareReceipt,
} from "../../lib/types/index.js";

const ACTIONS = [
  "add",
  "request",
  "sync",
  "receipts",
  "net",
  "redeem",
  "list",
  "status",
  "test",
  "remove",
  "pause",
  "resume",
  "set",
] as const;

/**
 * Parse a share link into its parts.
 *
 * The token rides in the fragment so it is never sent to whatever host resolves
 * the URL — fragments are not transmitted.
 * Shape: `neurolink://share/<host>[/<path>]#<token>`
 *
 * Everything between `share/` and the fragment is the lender's address,
 * **including any path**. A lender fronted at `example.com/proxy` is an ordinary
 * reverse-proxy layout, and dropping the path silently produced a peer URL
 * nothing answers on.
 */
export function parseShareLink(
  link: string,
): { url: string; token: string; receiptSecret?: string } | undefined {
  const hashIndex = link.indexOf("#");
  if (hashIndex < 0) {
    return undefined;
  }
  const fragment = link.slice(hashIndex + 1).trim();
  // `<token>.<receiptSecret>`. Neither half's alphabet contains a ".", and a
  // link minted before receipts existed simply has no second half.
  const separator = fragment.indexOf(".");
  const token = separator < 0 ? fragment : fragment.slice(0, separator);
  const receiptSecret =
    separator < 0 ? undefined : fragment.slice(separator + 1);
  const withoutFragment = link.slice(0, hashIndex);
  const queryIndex = withoutFragment.indexOf("?");
  const query = queryIndex >= 0 ? withoutFragment.slice(queryIndex + 1) : "";
  const path =
    queryIndex >= 0 ? withoutFragment.slice(0, queryIndex) : withoutFragment;
  const match = /^neurolink:\/\/share\/(.+)$/.exec(path);
  if (!match || !token) {
    return undefined;
  }
  const host = match[1];
  // https unless the link says otherwise. Guessing https for a loopback or LAN
  // origin would produce a peer URL nothing answers on.
  const scheme = /(^|&)scheme=http(&|$)/.test(query) ? "http" : "https";
  const url = /^https?:\/\//.test(host) ? host : `${scheme}://${host}`;
  return {
    url: url.replace(/\/+$/, ""),
    token,
    ...(receiptSecret ? { receiptSecret } : {}),
  };
}

function describePeer(peer: ProxyPeer, now: number): string {
  const cooling =
    peer.cooldownUntil && peer.cooldownUntil > now
      ? `cooling ${Math.ceil((peer.cooldownUntil - now) / 1000)}s (${peer.cooldownReason ?? "unknown"})`
      : "ready";
  const lines = [
    `${peer.name}`,
    `  url             ${peer.url}`,
    `  priority        ${peer.priority}`,
    `  state           ${peer.enabled ? cooling : "disabled"}`,
  ];
  if (peer.lastUsedAt) {
    lines.push(`  last served     ${new Date(peer.lastUsedAt).toISOString()}`);
  }
  if (peer.lastObservation) {
    const observation = peer.lastObservation;
    const parts: string[] = [];
    if (observation.grantStatus) {
      parts.push(observation.grantStatus);
    }
    if (observation.remainingCoins !== undefined) {
      parts.push(`${Math.floor(observation.remainingCoins)} coins left`);
    }
    if (parts.length > 0) {
      lines.push(`  lender says     ${parts.join(", ")}`);
    }
  }
  if (peer.note) {
    lines.push(`  note            ${peer.note}`);
  }
  return lines.join("\n");
}

async function requirePeer(name: string | undefined): Promise<ProxyPeer> {
  if (!name) {
    throw new Error("--name is required for this action.");
  }
  const peer = await getPeer(name);
  if (!peer) {
    throw new Error(`No peer named "${name}".`);
  }
  return peer;
}

/**
 * Ask a peer what our grant may still do.
 *
 * `/peer/handshake` and `/peer/limits` touch no account and spend nothing, so
 * this is genuinely free to run. Older lenders predate those routes; for them
 * the fall-back reads the gate's refusal headers off a request shaped so it
 * cannot be served.
 */
async function testPeer(peer: ProxyPeer): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const handshake = await fetch(`${peer.url}/peer/handshake`, {
      headers: { "x-neurolink-share-token": peer.token },
      signal: controller.signal,
    });
    if (handshake.ok) {
      const negotiated = (await handshake.json().catch(() => null)) as {
        ok?: boolean;
        grant?: { state?: string };
        error?: { type?: string };
      } | null;
      if (negotiated?.error?.type === "authentication_error") {
        return "rejected — the lender does not recognize this token";
      }
      if (negotiated?.ok === true) {
        const state = negotiated.grant?.state ?? "active";
        if (state !== "active") {
          return `reachable — grant is ${state}`;
        }
        const limits = await fetch(`${peer.url}/peer/limits`, {
          headers: { "x-neurolink-share-token": peer.token },
          signal: controller.signal,
        });
        const view = (await limits.json().catch(() => null)) as {
          servable?: boolean;
          withheldReason?: string;
          remainingCoins?: number;
        } | null;
        if (view?.servable === false) {
          return `reachable — withheld (${view.withheldReason ?? "no capacity"})`;
        }
        return view?.remainingCoins !== undefined
          ? `reachable — grant accepted, ${view.remainingCoins} coins left`
          : "reachable — grant accepted";
      }
    }

    // Pre-handshake lender. A deliberately invalid model exercises the gate
    // without naming a real one, and the refusal headers carry the answer.
    const response = await fetch(`${peer.url}/v1/messages`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-neurolink-share-token": peer.token,
      },
      body: JSON.stringify({
        model: "neurolink-share-probe",
        max_tokens: 1,
        messages: [{ role: "user", content: "probe" }],
      }),
      signal: controller.signal,
    });
    await response.text().catch(() => "");
    const reason = response.headers.get("x-neurolink-grant-reason");
    const status = response.headers.get("x-neurolink-grant-status");
    if (reason === "missing_token" || reason === "unknown_token") {
      return "rejected — the lender does not recognize this token";
    }
    if (status && status !== "active") {
      return `reachable — grant is ${status}`;
    }
    return "reachable — grant accepted";
  } catch (error) {
    return `unreachable — ${error instanceof Error ? error.message : String(error)}`;
  } finally {
    clearTimeout(timeout);
  }
}

/** How long a peer control-plane call may sit before it is abandoned. */
const PEER_REQUEST_TIMEOUT_MS = 15_000;

/**
 * `fetch` with a deadline, for the peer control plane.
 *
 * Every call below reaches a machine on someone else's network, and Node's
 * fetch has no default timeout — a lender that accepts the connection and then
 * says nothing hangs the command forever, with no output and no exit.
 *
 * The body is drained inside the deadline rather than after it: each caller
 * reads the payload immediately, and a timer cleared at the response headers
 * would leave a stalled body just as unbounded as no timer at all. The returned
 * Response is a buffered copy, so `.ok`, `.status` and `.json()` all still work.
 */
async function peerFetch(
  url: string,
  init: RequestInit = {},
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PEER_REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    const body = await response.text();
    // 204/205/304 are null-body statuses; the Response constructor rejects a
    // body on them even when it is empty.
    const nullBody =
      response.status === 204 ||
      response.status === 205 ||
      response.status === 304;
    return new Response(nullBody ? null : body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function lodgeProvisionRequest(peer: ProxyPeer): Promise<void> {
  const { generateProvisionState } =
    await import("../../lib/proxy/shareProvisioning.js");
  const codeVerifier = randomBytes(32).toString("base64url");
  const codeChallenge = createHash("sha256")
    .update(codeVerifier)
    .digest("base64url");
  const state = generateProvisionState();

  const response = await peerFetch(`${peer.url}/peer/provision`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-neurolink-share-token": peer.token,
    },
    body: JSON.stringify({ codeChallenge, state }),
  });
  const payload = (await response.json().catch(() => null)) as {
    ok?: boolean;
    error?: { message?: string };
  } | null;
  if (!response.ok || !payload?.ok) {
    throw new Error(
      `${peer.name} declined the request: ${
        payload?.error?.message ?? `HTTP ${response.status}`
      }`,
    );
  }

  await updatePeer(peer.name, {
    pendingProvision: { codeVerifier, state, requestedAt: Date.now() },
  });
  console.info(`Asked ${peer.name} to provision a credential for you.`);
  console.info("");
  console.info("  They run:");
  console.info("    neurolink proxy share provision --peer <your-label>");
  console.info("");
  console.info("  Then collect it with:");
  console.info(`    neurolink proxy peer request --name ${peer.name} --claim`);
  console.info("");
  console.info(
    "  Your PKCE verifier stays on this machine — the lender never sees it,",
  );
  console.info(
    "  and the code they relay is worthless to anyone who intercepts it.",
  );
}

/**
 * Collect an authorized code and turn it into a resident credential.
 *
 * The token exchange happens here, on this machine, with this machine's
 * verifier. It is the only step in the whole flow that ever holds a token for
 * the lender's account.
 */
async function claimProvisionedCredential(
  peer: ProxyPeer,
  argv: ProxyPeerArgs,
): Promise<void> {
  const pending = peer.pendingProvision;
  if (!pending) {
    throw new Error(
      `No outstanding provisioning request for ${peer.name}. ` +
        `Run \`neurolink proxy peer request --name ${peer.name}\` first.`,
    );
  }

  const claimResponse = await peerFetch(`${peer.url}/peer/provision`, {
    headers: { "x-neurolink-share-token": peer.token },
  });
  const claimPayload = (await claimResponse.json().catch(() => null)) as {
    ok?: boolean;
    status?: string;
    claim?: {
      code?: string;
      state?: string;
      accountLabel?: string;
      leaseSecret?: string;
      lease?: unknown;
      lenderUrl?: string;
    };
    error?: { message?: string };
  } | null;
  if (!claimResponse.ok || !claimPayload?.ok) {
    throw new Error(
      `${peer.name} declined the claim: ${
        claimPayload?.error?.message ?? `HTTP ${claimResponse.status}`
      }`,
    );
  }
  if (claimPayload.status === "pending") {
    console.info(
      `${peer.name} has not authorized yet. Try again once they have.`,
    );
    return;
  }
  if (claimPayload.status !== "ready" || !claimPayload.claim?.code) {
    // "none" means the request expired or was never lodged; either way the
    // verifier we are holding can no longer be redeemed.
    await updatePeer(peer.name, { pendingProvision: null });
    throw new Error(
      `${peer.name} has no authorization waiting — the request expired. Ask again.`,
    );
  }

  const claim = claimPayload.claim;
  const lease = claim.lease as ProxyShareLease | undefined;
  const code = claim.code;
  if (
    !code ||
    !claim.accountLabel ||
    !claim.leaseSecret ||
    !lease?.grantId ||
    !claim.state
  ) {
    throw new Error("That claim is missing required fields.");
  }
  if (claim.state !== pending.state) {
    // The state we generated must come back untouched. A mismatch means the
    // code belongs to some other authorization, and exchanging it would bind us
    // to an account nobody agreed to.
    throw new Error(
      "The lender returned a code for a different request. Nothing was installed.",
    );
  }

  const { tokenStore } = await import("../../lib/auth/tokenStore.js");
  const accountLabel = argv.label ?? `${peer.name}-shared`;
  const providerKey = `anthropic:${accountLabel}`;
  // Label collisions are not cosmetic here: Anthropic quota snapshots are keyed
  // by the bare label, so two accounts sharing one would merge each other's
  // windows and route on numbers that describe neither.
  const existing = await tokenStore.listByPrefix("anthropic:");
  if (existing.some((key) => key.toLowerCase() === providerKey.toLowerCase())) {
    throw new Error(
      `An account labelled "${accountLabel}" already exists here. ` +
        "Re-run with --label <name> to pick another.",
    );
  }

  const { exchangeSubscriptionCode } =
    await import("../../lib/auth/anthropicOAuth.js");
  const tokens = await exchangeSubscriptionCode({
    code,
    state: claim.state,
    codeVerifier: pending.codeVerifier,
  });

  // Open the grant store before the credential lands, so a failure to reach it
  // costs nothing. Past this point the two writes have to be kept together.
  const { initResidentGrants, saveResidentGrant } =
    await import("../../lib/proxy/residentGrants.js");
  const { resolveProxyResidentGrantsPath } =
    await import("../../lib/proxy/proxyPaths.js");
  initResidentGrants(
    resolveProxyResidentGrantsPath(resolveProxyPaths(argv.dev ?? false)),
  );

  await tokenStore.saveTokens(providerKey, {
    accessToken: tokens.accessToken,
    ...(tokens.refreshToken ? { refreshToken: tokens.refreshToken } : {}),
    // Without a stated expiry, assume it is already due so the first use
    // refreshes rather than sending a token the provider may have retired.
    expiresAt: tokens.expiresAt ?? Date.now(),
    tokenType: "Bearer",
  });

  try {
    await saveResidentGrant({
      schemaVersion: 1,
      accountLabel,
      grantId: lease.grantId,
      lenderName: peer.name,
      lenderUrl: (claim.lenderUrl ?? peer.url).replace(/\/+$/, ""),
      leaseSecret: claim.leaseSecret,
      lease,
    });
  } catch (error) {
    // The credential routes from the moment it lands in the token store, but
    // it is the resident grant that carries the lease — the expiry, the
    // heartbeat address, the accounting. A credential stored without one runs
    // forever, renews nothing and shows no sign of having come from a peer,
    // which is exactly the arrangement both sides agreed it would not be.
    //
    // So take it back out. The label collision check above is what makes that
    // safe: this key cannot be an account that already existed here.
    let rolledBack = true;
    await tokenStore.clearTokens(providerKey).catch(() => {
      rolledBack = false;
    });
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Could not record the lease for ${accountLabel}: ${detail}. ` +
        (rolledBack
          ? "The credential was removed rather than left unleased — nothing was installed."
          : `The credential could NOT be removed; delete "${providerKey}" by hand before retrying.`),
      { cause: error },
    );
  }
  await updatePeer(peer.name, { pendingProvision: null });

  console.info(`Provisioned ${accountLabel} from ${peer.name}.`);
  console.info(
    "  It now routes alongside your own accounts, for as long as the lease holds.",
  );
  console.info(
    "  The lender never held this credential — you exchanged the code yourself.",
  );
  if (!claim.lenderUrl) {
    console.info("");
    console.info(
      "  The claim carries no heartbeat address, so this credential cannot",
    );
    console.info(
      "  renew — it will stop when the lease's offline grace runs out.",
    );
  }
}

/**
 * Collect and check a lender's receipts.
 *
 * The point is not to see the charges — it is to check them. Every receipt is
 * verified against the shared secret, recomputed from its own usage block, and
 * the run is checked for holes, because a charge the lender simply never showed
 * us is the one failure a list of charges cannot reveal.
 */
async function reviewPeerReceipts(
  peer: ProxyPeer,
  json: boolean,
): Promise<void> {
  const response = await peerFetch(`${peer.url}/peer/receipts?since=0`, {
    headers: { "x-neurolink-share-token": peer.token },
  });
  const payload = (await response.json().catch(() => null)) as {
    ok?: boolean;
    receipts?: ProxyShareReceipt[];
    error?: { message?: string };
  } | null;
  if (!response.ok || payload?.ok !== true) {
    throw new Error(
      `${peer.name} would not hand over receipts: ${
        payload?.error?.message ?? `HTTP ${response.status}`
      }`,
    );
  }
  const collected = payload.receipts ?? [];
  const { auditShareReceipts } =
    await import("../../lib/proxy/shareReceipts.js");
  const statement = auditShareReceipts(
    collected[0]?.grantId ?? peer.name,
    collected,
    peer.receiptSecret,
  );
  if (json) {
    console.info(JSON.stringify({ statement, receipts: collected }, null, 2));
    return;
  }
  if (collected.length === 0) {
    console.info(`${peer.name} has charged you nothing yet.`);
    return;
  }
  console.info(
    `${peer.name}: ${statement.receipts} receipt(s), ${statement.coins.toFixed(1)} coins charged`,
  );
  if (!peer.receiptSecret) {
    console.info(
      "  No receipt secret on file — nothing here has been verified.",
    );
  } else if (statement.unverified > 0) {
    console.info(
      `  ⚠ ${statement.unverified} receipt(s) did not verify against this lender's secret`,
    );
  }
  if (statement.miscounted > 0) {
    console.info(
      `  ⚠ ${statement.miscounted} receipt(s) charge more or less than their own usage implies`,
    );
  }
  if (statement.gaps.length > 0) {
    console.info(
      `  ⚠ ${statement.gaps.length} charge(s) were never shown to you (missing sequence numbers)`,
    );
  }
  if (
    statement.unverified === 0 &&
    statement.miscounted === 0 &&
    statement.gaps.length === 0 &&
    peer.receiptSecret
  ) {
    console.info("  Every charge verified and matches its own usage.");
  }
  await updatePeer(peer.name, {
    lastReceiptSequence: statement.latestSequence,
  });
}

/**
 * Settle a round of reciprocal netting with a peer we also lend to.
 *
 * Both sides state cumulative totals rather than a delta, so running this twice
 * forgives nothing the second time instead of paying out again.
 */
async function netWithPeer(
  peer: ProxyPeer,
  argv: ProxyPeerArgs,
): Promise<void> {
  if (!peer.receiptSecret) {
    throw new Error(
      `No receipt secret on file for ${peer.name}, so a netting claim cannot be signed. ` +
        "Re-add the peer from a fresh share link.",
    );
  }
  // The other half of the pair: the grant *this* node issued to the same person.
  const reciprocal = argv.reciprocal ?? peer.reciprocalPeer ?? peer.name;
  const { initShareGrants, findShareGrantByPeer } =
    await import("../../lib/proxy/shareGrants.js");
  const { resolveProxyGrantsPath, resolveProxyReceiptsPath } =
    await import("../../lib/proxy/proxyPaths.js");
  const paths = resolveProxyPaths(argv.dev ?? false);
  initShareGrants(resolveProxyGrantsPath(paths));
  const ourGrant = await findShareGrantByPeer(reciprocal);
  if (!ourGrant) {
    throw new Error(
      `Netting needs a grant you issued to ${peer.name}. None is labelled "${reciprocal}" — ` +
        "name it with --reciprocal <label>, or issue one with `neurolink proxy share create`.",
    );
  }

  const { initShareReceipts, totalReceiptedCoins, nettedCoinsFor } =
    await import("../../lib/proxy/shareReceipts.js");
  initShareReceipts(resolveProxyReceiptsPath(paths));
  const consumedByYou = await totalReceiptedCoins(ourGrant.id);
  const alreadyNetted = await nettedCoinsFor(ourGrant.id);

  const { signSharePayload } = await import("../../lib/proxy/shareSigning.js");
  const grantId = await resolvePeerGrantId(peer);
  const signature = signSharePayload(
    { consumedByYou, alreadyNetted, grantId },
    peer.receiptSecret,
  );

  const response = await peerFetch(`${peer.url}/peer/net`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-neurolink-share-token": peer.token,
    },
    body: JSON.stringify({ consumedByYou, alreadyNetted, signature }),
  });
  const payload = (await response.json().catch(() => null)) as {
    ok?: boolean;
    netted?: number;
    totalNetted?: number;
    detail?: string;
    error?: { message?: string };
  } | null;
  if (!response.ok || payload?.ok !== true) {
    throw new Error(
      `${peer.name} declined to net: ${
        payload?.error?.message ?? `HTTP ${response.status}`
      }`,
    );
  }
  const round = payload.netted ?? 0;
  if (round > 0) {
    // Forgive the same amount on our own side, so the two ledgers stay level.
    const { applyReciprocalNetting } =
      await import("../../lib/proxy/shareReceipts.js");
    await applyReciprocalNetting({
      grantId: ourGrant.id,
      consumedFromPeer: alreadyNetted + round,
      peerAlreadyNetted: alreadyNetted,
    });
  }
  await updatePeer(peer.name, { reciprocalPeer: reciprocal });
  console.info(
    round > 0
      ? `Netted ${round.toFixed(1)} coins with ${peer.name}. ${payload.detail ?? ""}`.trim()
      : `Nothing to net with ${peer.name}: ${payload.detail ?? "positions already level"}`,
  );
}

/**
 * The grant id behind our token for this peer.
 *
 * A share token carries its grant id, so this needs no round trip — and the
 * netting signature has to be bound to the grant it credits, or a claim signed
 * for one peer could be replayed against another.
 */
async function resolvePeerGrantId(peer: ProxyPeer): Promise<string> {
  const { parseShareToken } = await import("../../lib/proxy/shareGrants.js");
  const parsed = parseShareToken(peer.token);
  if (!parsed) {
    throw new Error(`The token stored for ${peer.name} is not a share token.`);
  }
  return parsed.grantId;
}

/** Present a coin note to its issuer, to check it or to spend it. */
async function presentCoinNote(
  peer: ProxyPeer,
  argv: ProxyPeerArgs,
): Promise<void> {
  const note = argv.noteValue;
  if (!note) {
    throw new Error(
      "peer redeem needs --coin-note <the note the issuer gave you>.",
    );
  }
  const redeem = !argv.check;
  const response = await peerFetch(`${peer.url}/peer/note`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-neurolink-share-token": peer.token,
    },
    body: JSON.stringify({ note, redeem }),
  });
  const payload = (await response.json().catch(() => null)) as {
    ok?: boolean;
    status?: string;
    coins?: number;
    balance?: number | null;
    error?: { message?: string };
  } | null;
  if (payload?.ok !== true) {
    throw new Error(
      payload?.error?.message ??
        `${peer.name} would not honour that note (HTTP ${response.status})`,
    );
  }
  if (!redeem) {
    console.info(
      `${peer.name} says that note is ${payload.status}${
        payload.coins ? ` (${payload.coins} coins)` : ""
      }.`,
    );
    return;
  }
  console.info(
    `Redeemed ${payload.coins ?? 0} coins with ${peer.name}.` +
      (payload.balance !== null && payload.balance !== undefined
        ? ` Your balance there is now ${Math.floor(payload.balance)}.`
        : ""),
  );
}

async function runPeerCommand(argv: ProxyPeerArgs): Promise<void> {
  const { initPeerStore } = await import("../../lib/proxy/peerStore.js");
  initPeerStore(resolveProxyPeersPath(resolveProxyPaths(argv.dev ?? false)));
  const now = Date.now();

  switch (argv.action) {
    case "add": {
      let url = argv.url;
      let token = argv.token;
      let receiptSecret = argv.receiptSecret;
      if (argv.link) {
        const parsed = parseShareLink(argv.link);
        if (!parsed) {
          throw new Error(
            "Could not read that share link. Expected neurolink://share/<host>#<token>.",
          );
        }
        url = parsed.url;
        token = parsed.token;
        receiptSecret = receiptSecret ?? parsed.receiptSecret;
      }
      if (!argv.name || !url || !token) {
        throw new Error(
          "peer add needs --name plus either --link, or --url and --token.",
        );
      }
      const peer = await addPeer({
        name: argv.name,
        url,
        token,
        ...(receiptSecret ? { receiptSecret } : {}),
        ...(argv.priority !== undefined ? { priority: argv.priority } : {}),
        ...(argv.note ? { note: argv.note } : {}),
      });
      console.info(describePeer(peer, now));
      console.info("");
      console.info(
        "  This peer is consulted only after every local account is spent.",
      );
      if (!receiptSecret) {
        console.info(
          "  No receipt secret came with this link, so charges cannot be checked.",
        );
        console.info(
          "  Ask the lender for one, or re-add from a link they mint fresh.",
        );
      }
      return;
    }

    case "request": {
      const peer = await requirePeer(argv.name);
      if (argv.claim) {
        await claimProvisionedCredential(peer, argv);
      } else {
        await lodgeProvisionRequest(peer);
      }
      return;
    }

    case "receipts": {
      const peer = await requirePeer(argv.name);
      await reviewPeerReceipts(peer, argv.json ?? false);
      return;
    }

    case "net": {
      const peer = await requirePeer(argv.name);
      await netWithPeer(peer, argv);
      return;
    }

    case "redeem": {
      const peer = await requirePeer(argv.name);
      await presentCoinNote(peer, argv);
      return;
    }

    case "sync": {
      const { initResidentGrants, heartbeatResidentGrant, listResidentGrants } =
        await import("../../lib/proxy/residentGrants.js");
      const { resolveProxyResidentGrantsPath } =
        await import("../../lib/proxy/proxyPaths.js");
      initResidentGrants(
        resolveProxyResidentGrantsPath(resolveProxyPaths(argv.dev ?? false)),
      );
      const residents = await listResidentGrants();
      if (residents.length === 0) {
        console.info("No adopted credentials to sync.");
        return;
      }
      for (const resident of residents) {
        if (!resident.lenderUrl) {
          console.info(`${resident.lenderName}: no heartbeat address`);
          continue;
        }
        const result = await heartbeatResidentGrant(resident);
        console.info(
          `${resident.lenderName}: ${result.stopped ? "stopped by lender" : result.detail}`,
        );
      }
      return;
    }

    case "list":
    case "status": {
      const peers = argv.name
        ? [await requirePeer(argv.name)]
        : await listPeers();
      if (argv.json) {
        console.info(JSON.stringify(peers, null, 2));
        return;
      }
      if (peers.length === 0) {
        console.info("No peers configured.");
        return;
      }
      for (const peer of peers) {
        console.info(describePeer(peer, now));
        console.info("");
      }
      return;
    }

    case "test": {
      const peers = argv.name
        ? [await requirePeer(argv.name)]
        : await listPeers();
      for (const peer of peers) {
        const verdict = await testPeer(peer);
        console.info(`${peer.name}: ${verdict}`);
      }
      return;
    }

    case "remove": {
      const peer = await requirePeer(argv.name);
      await removePeer(peer.name);
      console.info(`${peer.name} removed.`);
      return;
    }

    case "pause":
    case "resume": {
      const peer = await requirePeer(argv.name);
      const enabled = argv.action === "resume";
      await setPeerEnabled(peer.name, enabled);
      console.info(`${peer.name} is now ${enabled ? "enabled" : "paused"}.`);
      return;
    }

    case "set": {
      const peer = await requirePeer(argv.name);
      const updated = await updatePeer(peer.name, {
        ...(argv.priority !== undefined ? { priority: argv.priority } : {}),
        ...(argv.note !== undefined ? { note: argv.note } : {}),
        ...(argv.url ? { url: argv.url } : {}),
        ...(argv.token ? { token: argv.token } : {}),
      });
      console.info(updated ? describePeer(updated, now) : "No change.");
      return;
    }

    default:
      throw new Error(`Unknown peer action: ${String(argv.action)}`);
  }
}

export const proxyPeerCommand: CommandModule<object, ProxyPeerArgs> = {
  command: "peer <action>",
  describe: "Borrow pool capacity from a peer when this node's own is spent",
  builder: (yargs: Argv) =>
    yargs
      .positional("action", {
        type: "string",
        choices: [...ACTIONS],
        describe: "Peer action",
      })
      .option("name", {
        type: "string",
        description: "Local name for the peer",
      })
      .option("link", {
        type: "string",
        description: "Share link from the lender (neurolink://share/...)",
      })
      .option("url", {
        type: "string",
        description: "Lender's exposed proxy URL",
      })
      .option("token", {
        type: "string",
        description: "Share token issued by the lender",
      })
      .option("priority", {
        type: "number",
        description: "Lower is tried first (default 100)",
      })
      .option("note", {
        type: "string",
        description: "Free-text note kept with the peer",
      })
      .option("claim", {
        type: "boolean",
        default: false,
        description:
          "With `peer request`: collect a code the lender has authorized",
      })
      .option("label", {
        type: "string",
        description:
          "Local account label for the provisioned credential (default <peer>-shared)",
      })
      .option("receipt-secret", {
        type: "string",
        alias: "receiptSecret",
        description:
          "Secret this lender signs receipts with, when adding a peer by hand",
      })
      .option("reciprocal", {
        type: "string",
        description:
          "With `peer net`: label of the grant you issued to the same person",
      })
      .option("coin-note", {
        type: "string",
        alias: "noteValue",
        description: "With `peer redeem`: the coin note to present",
      })
      .option("check", {
        type: "boolean",
        default: false,
        description:
          "With `peer redeem`: ask the issuer about the note without spending it",
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
      await runPeerCommand(argv);
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    }
  },
};
