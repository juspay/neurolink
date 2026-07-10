/**
 * Per-session skill activation state.
 *
 * A skill activated via use_skill is pinned to its session: the tracker
 * holds the pinned instruction message until the turn is persisted
 * (drainPending → StoreConversationTurnOptions.skillMessages) and answers
 * "is this skill already loaded?" so re-invocations return a cheap
 * already_loaded note instead of the full body.
 *
 * The stored session history is the source of truth — pinned messages
 * carry `metadata.isSkill`. hydrate() rebuilds a session's active set from
 * stored messages on every activation attempt (use_skill is rare, one
 * history read per attempt), so dedup stays correct across process
 * restarts, multiple instances sharing a Redis memory backend, and failed
 * persistence: a pin that never reached storage simply re-activates on
 * the next turn instead of being falsely reported as loaded.
 */

import { randomUUID } from "node:crypto";
import type {
  ChatMessage,
  SkillActivationRecord,
  SkillDefinition,
} from "../types/index.js";

/** Upper bound on tracked sessions; oldest are evicted first (insertion order). */
const MAX_TRACKED_SESSIONS = 1000;

/** Render the pinned history message for an activated skill. */
export function buildSkillActivationMessage(
  skill: SkillDefinition,
): ChatMessage {
  const version = skill.version ?? 1;
  return {
    id: `skill-${randomUUID()}`,
    role: "user",
    content: `[Skill loaded: ${skill.name} v${version}]\n\n${skill.instructions}`,
    timestamp: new Date().toISOString(),
    metadata: {
      isSkill: true,
      skillId: skill.id,
      skillName: skill.name,
      skillVersion: version,
    },
  };
}

/** Activation record derived from a pinned history message, when it is one. */
function recordFromMessage(message: ChatMessage): SkillActivationRecord | null {
  const meta = message.metadata;
  if (!meta?.isSkill || !meta.skillId || !meta.skillName) {
    return null;
  }
  return {
    skillId: meta.skillId,
    name: meta.skillName,
    version: meta.skillVersion ?? 1,
    activatedAt: message.timestamp ?? new Date(0).toISOString(),
  };
}

export class SkillSessionTracker {
  /** sessionId → skillId → activation record. */
  private active = new Map<string, Map<string, SkillActivationRecord>>();
  /** sessionId → pinned messages awaiting persistence into the session turn. */
  private pending = new Map<string, ChatMessage[]>();

  /** Whether the skill is already active (loaded) in this session. */
  isActive(sessionId: string, skillId: string, name: string): boolean {
    return Boolean(this.getActivation(sessionId, skillId, name));
  }

  /** Activation record for an active skill (by id, falling back to name). */
  getActivation(
    sessionId: string,
    skillId: string,
    name?: string,
  ): SkillActivationRecord | undefined {
    const records = this.active.get(sessionId);
    if (!records) {
      return undefined;
    }
    const byId = records.get(skillId);
    if (byId || !name) {
      return byId;
    }
    for (const record of records.values()) {
      if (record.name === name) {
        return record;
      }
    }
    return undefined;
  }

  /**
   * Record an activation: marks the skill active and queues its pinned
   * message for persistence when the turn is stored.
   */
  recordActivation(sessionId: string, skill: SkillDefinition): ChatMessage {
    const message = buildSkillActivationMessage(skill);
    const record = recordFromMessage(message) as SkillActivationRecord;
    this.recordsFor(sessionId).set(skill.id, record);
    const queue = this.pending.get(sessionId);
    if (queue) {
      queue.push(message);
    } else {
      this.pending.set(sessionId, [message]);
    }
    return message;
  }

  /**
   * Rebuild the active set from stored session history, then merge the
   * in-process pending activations (this turn's pins, not yet stored).
   * Called before every dedup check — the rebuild keeps state truthful
   * when other instances pinned skills or when a past pin never reached
   * storage.
   */
  hydrate(sessionId: string, storedMessages: ChatMessage[]): void {
    const records = new Map<string, SkillActivationRecord>();
    for (const message of storedMessages) {
      const record = recordFromMessage(message);
      if (record && !records.has(record.skillId)) {
        records.set(record.skillId, record);
      }
    }
    for (const message of this.pending.get(sessionId) ?? []) {
      const record = recordFromMessage(message);
      if (record) {
        records.set(record.skillId, record);
      }
    }
    this.recordsFor(sessionId); // reserve the slot (applies the session cap)
    this.active.set(sessionId, records);
  }

  /**
   * Remove and return the pinned messages queued for this session. Called
   * once per turn by the memory-store path; an empty result means nothing
   * was activated this turn.
   */
  drainPending(sessionId: string): ChatMessage[] {
    const queue = this.pending.get(sessionId);
    if (!queue || queue.length === 0) {
      return [];
    }
    this.pending.delete(sessionId);
    return queue;
  }

  /** Active skill records for a session (listing/debugging). */
  listActive(sessionId: string): SkillActivationRecord[] {
    return Array.from(this.active.get(sessionId)?.values() ?? []);
  }

  private recordsFor(sessionId: string): Map<string, SkillActivationRecord> {
    let records = this.active.get(sessionId);
    if (!records) {
      if (this.active.size >= MAX_TRACKED_SESSIONS) {
        const oldest = this.active.keys().next().value;
        if (oldest !== undefined) {
          this.active.delete(oldest);
          this.pending.delete(oldest);
        }
      }
      records = new Map();
      this.active.set(sessionId, records);
    }
    return records;
  }
}
