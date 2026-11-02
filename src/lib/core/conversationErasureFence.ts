/**
 * Conversation erasure write fence (`conversation-erasure-v1`).
 *
 * A writer that opts in is admitted once, at initialization, against a
 * standalone Redis running `maxmemory-policy noeviction`. Each later write is
 * one atomic script that refuses unless the server run id, the store epoch and
 * the eviction counter still match what the writer was admitted under, and
 * refuses a session whose erasure tombstone exists. A permanent erasure sets
 * the tombstone, deletes the session's keys and index entry in the same script.
 *
 * Only participating writers are fenced. A writer that did not opt in keeps the
 * ordinary storage behaviour (`legacy` mode) and cannot erase permanently.
 */

import { createHash, randomUUID } from "node:crypto";
import {
  ConversationSessionErasedError,
  ConversationWriterEpochError,
} from "../types/index.js";
import type {
  ConversationErasureProtocol,
  ConversationErasureResult,
  ConversationErasureWriteContext,
  ConversationErasureWriterStatus,
  RedisClient,
  RedisStorageConfig,
} from "../types/index.js";
import {
  addToSetWithTtl,
  getSessionKey,
  getSessionMessagesKey,
  getUserSessionsKey,
  setWithTtl,
} from "../utils/redis.js";

export {
  ConversationSessionErasedError,
  ConversationWriterEpochError,
} from "../types/index.js";

export const ERASURE_FENCE_PROTOCOL: ConversationErasureProtocol =
  "conversation-erasure-v1";

const digest = (value: string): string =>
  createHash("sha256").update(value).digest("hex");

/** Key of the per-session erasure tombstone. */
export const erasureFenceKey = (sessionKey: string): string =>
  `neurolink-erasure-v1:${digest(sessionKey)}`;

const epochKey = (config: Required<RedisStorageConfig>): string =>
  `neurolink-erasure-epoch-v1:${digest(
    JSON.stringify([config.keyPrefix, config.userSessionsKeyPrefix]),
  )}`;

const infoField = (info: string, name: string): string | undefined =>
  new RegExp(`(?:^|[\\r\\n])${name}:([^\\r\\n]+)`).exec(info)?.[1];

// Binds the epoch record to the current server run: a restarted server (whose
// data may have been lost) gets a fresh epoch, and an eviction-capable policy
// is refused outright.
const PREPARE_SCRIPT = String.raw`
local server=redis.call('INFO','server')
local current=string.match(server,'run_id:([^\r\n]+)')
if current~=ARGV[1] then return redis.error_reply('SESSION_WRITER_EPOCH_LOST') end
local memory=redis.call('INFO','memory')
if string.match(memory,'maxmemory_policy:([^\r\n]+)')~='noeviction' then return redis.error_reply('SESSION_WRITER_POLICY_UNSUPPORTED') end
local stored=redis.call('GET',KEYS[1])
if not stored or string.sub(stored,1,string.len(ARGV[1])+1)~=ARGV[1]..':' then
 stored=ARGV[1]..':'..ARGV[2];redis.call('SET',KEYS[1],stored)
end
local stats=redis.call('INFO','stats')
local evicted=string.match(stats,'evicted_keys:(%d+)')
if not evicted then return redis.error_reply('SESSION_WRITER_EPOCH_LOST') end
return {stored,evicted}`;

/**
 * Resolve the write context once, before the manager admits asynchronous work
 * (not at the later commit of a write).
 *
 * Without `strict` the writer does not participate and stays `legacy`. With
 * `strict`, anything short of a standalone, non-evicting Redis whose epoch
 * could be read and pinned throws {@link ConversationWriterEpochError}.
 */
export const prepareConversationWriteContext = async (
  client: RedisClient,
  config: Required<RedisStorageConfig>,
  strict = false,
): Promise<ConversationErasureWriteContext> => {
  if (!strict) {
    return Object.freeze({
      mode: "legacy",
      reason: "compatible-client",
      strict: false,
    });
  }
  try {
    const cluster = await client.info("cluster");
    if (infoField(cluster, "cluster_enabled") !== "0") {
      throw new ConversationWriterEpochError();
    }
    const memory = await client.info("memory");
    if (infoField(memory, "maxmemory_policy") !== "noeviction") {
      throw new ConversationWriterEpochError();
    }
    const server = await client.info("server");
    const runId = infoField(server, "run_id");
    if (!runId) {
      throw new ConversationWriterEpochError();
    }
    const result = await client.eval(PREPARE_SCRIPT, {
      keys: [epochKey(config)],
      arguments: [runId, randomUUID()],
    });
    if (
      !Array.isArray(result) ||
      typeof result[0] !== "string" ||
      !/^\d+$/.test(String(result[1]))
    ) {
      throw new ConversationWriterEpochError();
    }
    return Object.freeze({
      mode: "fenced",
      strict,
      runId,
      epoch: result[0],
      evictedKeys: String(result[1]),
      evictionPolicy: "noeviction",
    });
  } catch {
    throw new ConversationWriterEpochError();
  }
};

// KEYS: 1 session blob, 2 messages LIST, 3 user index SET, 4 tombstone, 5 epoch
// ARGV: 1 mode, 2 session id, 3 ttl, 4 payload / append mode, 5 messages JSON,
//       6 metadata payload, 7 spare, 8 run id, 9 epoch, 10 eviction counter
const FENCED_SCRIPT = String.raw`
local server=redis.call('INFO','server')
if string.match(server,'run_id:([^\r\n]+)')~=ARGV[8] then return redis.error_reply('SESSION_WRITER_EPOCH_LOST') end
if redis.call('GET',KEYS[5])~=ARGV[9] then return redis.error_reply('SESSION_WRITER_EPOCH_LOST') end
local memory=redis.call('INFO','memory')
if string.match(memory,'maxmemory_policy:([^\r\n]+)')~='noeviction' then return redis.error_reply('SESSION_WRITER_EPOCH_LOST') end
local stats=redis.call('INFO','stats')
if string.match(stats,'evicted_keys:(%d+)')~=ARGV[10] then return redis.error_reply('SESSION_WRITER_EPOCH_LOST') end
local mode=ARGV[1]
if mode=='erase' then
 redis.call('SET',KEYS[4],'conversation-erasure-v1')
 local deleted=redis.call('DEL',KEYS[1],KEYS[2])
 local member=redis.call('SREM',KEYS[3],ARGV[2])
 return {1,deleted,member}
end
if redis.call('EXISTS',KEYS[4])~=0 then return redis.error_reply('SESSION_ERASED') end
local ttl=tonumber(ARGV[3])
if mode=='index' then
 redis.call('SADD',KEYS[3],ARGV[2]);if ttl>0 then redis.call('EXPIRE',KEYS[3],ttl) end;return 1
end
if mode=='persist' then
 if ARGV[4]=='replace' then redis.call('DEL',KEYS[2]) end
 for _,message in ipairs(cjson.decode(ARGV[5])) do redis.call('RPUSH',KEYS[2],message) end
 redis.call('SET',KEYS[1],ARGV[6]);if ttl>0 then redis.call('EXPIRE',KEYS[1],ttl);redis.call('EXPIRE',KEYS[2],ttl) end;return 1
end
if mode=='metadata' then
 redis.call('SET',KEYS[1],ARGV[4]);if ttl>0 then redis.call('EXPIRE',KEYS[1],ttl) end;return 1
end
return redis.error_reply('Unsupported erasure-fence mode')`;

const fenceKeys = (
  config: Required<RedisStorageConfig>,
  sessionId: string,
  userId: string | undefined,
): string[] => {
  const sessionKey = getSessionKey(config, sessionId, userId);
  return [
    sessionKey,
    getSessionMessagesKey(config, sessionId, userId),
    getUserSessionsKey(config, userId || "randomUser"),
    erasureFenceKey(sessionKey),
    epochKey(config),
  ];
};

const errorText = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const runFenced = async (
  client: RedisClient,
  config: Required<RedisStorageConfig>,
  sessionId: string,
  userId: string | undefined,
  scriptArguments: string[],
  context: ConversationErasureWriteContext | undefined,
): Promise<unknown> => {
  if (context?.mode !== "fenced") {
    throw new ConversationWriterEpochError();
  }
  const padded = [...scriptArguments];
  while (padded.length < 7) {
    padded.push("");
  }
  padded.push(context.runId, context.epoch, context.evictedKeys);
  try {
    return await client.eval(FENCED_SCRIPT, {
      keys: fenceKeys(config, sessionId, userId),
      arguments: padded,
    });
  } catch (error) {
    const text = errorText(error);
    if (text.includes("SESSION_ERASED")) {
      throw new ConversationSessionErasedError();
    }
    if (text.includes("SESSION_WRITER_EPOCH_LOST")) {
      throw new ConversationWriterEpochError();
    }
    throw error;
  }
};

/** Write the session metadata blob (SET plus TTL). */
export const fencedSessionMetadataWrite = async (
  client: RedisClient,
  config: Required<RedisStorageConfig>,
  sessionId: string,
  userId: string | undefined,
  payload: string,
  context: ConversationErasureWriteContext | undefined,
): Promise<void> => {
  if (context?.mode === "legacy") {
    await setWithTtl(
      client,
      getSessionKey(config, sessionId, userId),
      payload,
      config.ttl,
    );
    return;
  }
  await runFenced(
    client,
    config,
    sessionId,
    userId,
    ["metadata", sessionId, String(config.ttl), payload],
    context,
  );
};

/** Add the session to the user's session index (SADD plus TTL). */
export const fencedSessionIndexWrite = async (
  client: RedisClient,
  config: Required<RedisStorageConfig>,
  sessionId: string,
  userId: string,
  context: ConversationErasureWriteContext | undefined,
): Promise<void> => {
  if (context?.mode === "legacy") {
    await addToSetWithTtl(
      client,
      getUserSessionsKey(config, userId),
      sessionId,
      config.ttl,
    );
    return;
  }
  await runFenced(
    client,
    config,
    sessionId,
    userId,
    ["index", sessionId, String(config.ttl)],
    context,
  );
};

/**
 * Write the message LIST and the metadata blob together. Resolves to 1 once
 * the write landed; a refused write throws instead.
 */
export const fencedSessionPersist = async (
  client: RedisClient,
  config: Required<RedisStorageConfig>,
  sessionId: string,
  userId: string | undefined,
  write: { mode: "replace" | "append"; messages: string[]; payload: string },
  context: ConversationErasureWriteContext | undefined,
): Promise<number> => {
  const { mode, messages, payload } = write;
  if (context?.mode === "legacy") {
    const blobKey = getSessionKey(config, sessionId, userId);
    const listKey = getSessionMessagesKey(config, sessionId, userId);
    const transaction = client.multi();
    if (mode === "replace") {
      transaction.del(listKey);
    }
    if (messages.length > 0) {
      transaction.rPush(listKey, messages);
    }
    transaction.set(blobKey, payload);
    if (config.ttl > 0) {
      transaction.expire(blobKey, config.ttl);
      transaction.expire(listKey, config.ttl);
    }
    await transaction.exec();
    return 1;
  }
  await runFenced(
    client,
    config,
    sessionId,
    userId,
    [
      "persist",
      sessionId,
      String(config.ttl),
      mode,
      JSON.stringify(messages),
      payload,
    ],
    context,
  );
  return 1;
};

/**
 * Permanently erase one session: tombstone, data keys and index entry in one
 * atomic step. Requires a strict, fenced writer and an explicit session and
 * user id.
 */
export const eraseSessionPermanently = async (
  client: RedisClient,
  config: Required<RedisStorageConfig>,
  sessionId: string,
  userId: string,
  context: ConversationErasureWriteContext | undefined,
): Promise<ConversationErasureResult> => {
  if (
    typeof sessionId !== "string" ||
    !sessionId.trim() ||
    typeof userId !== "string" ||
    !userId.trim()
  ) {
    throw new Error(
      "Explicit sessionId and userId are required for permanent erasure",
    );
  }
  if (context?.mode !== "fenced" || context.strict !== true) {
    throw new ConversationWriterEpochError();
  }
  const result = await runFenced(
    client,
    config,
    sessionId,
    userId,
    ["erase", sessionId],
    context,
  );
  if (!Array.isArray(result) || Number(result[0]) !== 1) {
    throw new Error("Erasure outcome unconfirmed");
  }
  return {
    status: "erased",
    backend: "redis-standalone",
    protocol: ERASURE_FENCE_PROTOCOL,
    participatingWritesFenced: true,
    strictWriteProtocol: true,
    legacyWritersFenced: false,
    sessionId,
    userId,
    namespaceDigest: digest(getSessionKey(config, sessionId, userId)),
    serverRunIdDigest: digest(context.runId),
    storeEpochDigest: digest(context.epoch),
    evictionPolicy: "noeviction",
    evictionCounter: Number(context.evictedKeys),
    deletedKeys: Number(result[1]),
    removedIndexMembers: Number(result[2]),
    tombstoneExpiry: null,
  };
};

/** Whether the writer that resolved `context` participates in the v1 fence. */
export const conversationErasureWriterStatus = (
  context: ConversationErasureWriteContext | undefined,
): ConversationErasureWriterStatus => {
  if (context?.mode !== "fenced") {
    return {
      status: "unsupported",
      protocol: ERASURE_FENCE_PROTOCOL,
      strict: false,
      reason: context?.mode === "legacy" ? context.reason : "not-initialized",
    };
  }
  return {
    status: "participating",
    strict: context.strict === true,
    backend: "redis-standalone",
    protocol: ERASURE_FENCE_PROTOCOL,
    serverRunIdDigest: digest(context.runId),
    storeEpochDigest: digest(context.epoch),
    evictionPolicy: "noeviction",
    evictionCounter: Number(context.evictedKeys),
  };
};
