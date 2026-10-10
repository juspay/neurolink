/**
 * Message identity and metadata for a stored conversation turn.
 *
 * Both memory managers store a turn as a user message followed by an assistant
 * message. When the caller supplies a `turnId` the two messages get stable ids
 * (`${turnId}:user`, `${turnId}:assistant`), which lets a repeated store of the
 * same turn be recognised and skipped. When the caller sets neither a
 * `turnId` nor a `modality`, nothing here changes what is stored: ids stay
 * random and no metadata is added, so typed chat is byte-for-byte as before.
 */

import { randomUUID } from "node:crypto";
import { logger } from "./logger.js";
import type {
  ChatMessage,
  ChatMessageMetadata,
  StoreConversationTurnOptions,
  TurnMessageIdentity,
} from "../types/index.js";

/** How far back a repeated `turnId` is looked for. A turn is always the newest thing in a session. */
const DUPLICATE_LOOKBACK_MESSAGES = 200;

export function userTurnMessageId(turnId: string): string {
  return `${turnId}:user`;
}

export function assistantTurnMessageId(turnId: string): string {
  return `${turnId}:assistant`;
}

/** Identity and metadata for the user message of a turn. */
export function userTurnIdentity(
  options: Pick<StoreConversationTurnOptions, "turnId" | "modality">,
): TurnMessageIdentity {
  const metadata: ChatMessageMetadata = {};
  if (options.modality) {
    metadata.modality = options.modality;
  }
  if (options.turnId) {
    metadata.turnId = options.turnId;
  }
  return {
    id: options.turnId ? userTurnMessageId(options.turnId) : undefined,
    metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
  };
}

/** Identity and metadata for the assistant message of a turn. */
export function assistantTurnIdentity(
  options: Pick<
    StoreConversationTurnOptions,
    "turnId" | "modality" | "interrupted" | "callEnded"
  >,
  thoughtSignature?: string,
): TurnMessageIdentity {
  const metadata: ChatMessageMetadata = {};
  if (thoughtSignature) {
    metadata.thoughtSignature = thoughtSignature;
  }
  if (options.modality) {
    metadata.modality = options.modality;
  }
  if (options.turnId) {
    metadata.turnId = options.turnId;
  }
  if (options.interrupted) {
    metadata.interrupted = true;
  }
  if (options.callEnded) {
    metadata.callEnded = true;
  }
  return {
    id: options.turnId ? assistantTurnMessageId(options.turnId) : undefined,
    metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
  };
}

/** `id` and optional `metadata` of a stored message, ready to spread into it. */
export function turnMessageFields(identity: TurnMessageIdentity): {
  id: string;
  metadata?: ChatMessageMetadata;
} {
  return {
    id: identity.id ?? randomUUID(),
    ...(identity.metadata ? { metadata: identity.metadata } : {}),
  };
}

/** True when a turn with this id is already among the session's recent messages. */
export function isTurnAlreadyStored(
  messages: ReadonlyArray<Pick<ChatMessage, "id">>,
  turnId: string | undefined,
): boolean {
  if (!turnId) {
    return false;
  }
  const assistantId = assistantTurnMessageId(turnId);
  const start = Math.max(0, messages.length - DUPLICATE_LOOKBACK_MESSAGES);
  for (let index = messages.length - 1; index >= start; index -= 1) {
    if (messages[index].id === assistantId) {
      logger.debug("[conversationTurnIdentity] Turn already stored, skipping", {
        turnId,
      });
      return true;
    }
  }
  return false;
}
