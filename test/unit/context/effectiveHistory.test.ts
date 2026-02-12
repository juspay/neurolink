import { describe, it, expect } from "vitest";
import {
  getEffectiveHistory,
  tagForCondensation,
  tagForTruncation,
  removeCondensationTags,
  removeTruncationTags,
} from "../../../src/lib/context/effectiveHistory.js";
import type { ChatMessage } from "../../../src/lib/types/conversation.js";

function makeMessages(count: number): ChatMessage[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `msg-${i}`,
    role: (i % 2 === 0 ? "user" : "assistant") as ChatMessage["role"],
    content: `Message ${i}`,
    timestamp: new Date().toISOString(),
  }));
}

describe("Effective History", () => {
  describe("getEffectiveHistory", () => {
    it("should return all messages when no tags present", () => {
      const messages = makeMessages(5);
      const effective = getEffectiveHistory(messages);
      expect(effective).toHaveLength(5);
    });

    it("should filter out condensed messages", () => {
      const messages = makeMessages(5);
      messages[0].condenseParent = "summary-1";
      messages[1].condenseParent = "summary-1";

      const effective = getEffectiveHistory(messages);
      expect(effective).toHaveLength(3);
      expect(effective[0].id).toBe("msg-2");
    });

    it("should filter out truncated messages", () => {
      const messages = makeMessages(5);
      messages[0].truncationParent = "trunc-1";
      messages[1].truncationParent = "trunc-1";

      const effective = getEffectiveHistory(messages);
      expect(effective).toHaveLength(3);
    });

    it("should keep summary messages", () => {
      const messages: ChatMessage[] = [
        {
          id: "summary-1",
          role: "system",
          content: "Summary",
          condenseId: "c1",
          metadata: { isSummary: true },
          timestamp: new Date().toISOString(),
        },
        ...makeMessages(3),
      ];

      const effective = getEffectiveHistory(messages);
      expect(effective).toHaveLength(4);
      expect(effective[0].id).toBe("summary-1");
    });

    it("should keep truncation markers", () => {
      const messages: ChatMessage[] = [
        ...makeMessages(2),
        {
          id: "trunc-marker",
          role: "system",
          content: "Truncated",
          truncationId: "t1",
          isTruncationMarker: true,
          timestamp: new Date().toISOString(),
        },
        ...makeMessages(2).map((m, i) => ({ ...m, id: `msg-${i + 5}` })),
      ];

      const effective = getEffectiveHistory(messages);
      expect(effective.find((m) => m.isTruncationMarker)).toBeDefined();
    });
  });

  describe("tagForCondensation", () => {
    it("should tag messages within range", () => {
      const messages = makeMessages(5);
      const tagged = tagForCondensation(messages, 0, 3, "condense-1");

      expect(tagged[0].condenseParent).toBe("condense-1");
      expect(tagged[1].condenseParent).toBe("condense-1");
      expect(tagged[2].condenseParent).toBe("condense-1");
      expect(tagged[3].condenseParent).toBeUndefined();
      expect(tagged[4].condenseParent).toBeUndefined();
    });
  });

  describe("tagForTruncation", () => {
    it("should tag messages within range", () => {
      const messages = makeMessages(5);
      const tagged = tagForTruncation(messages, 1, 4, "trunc-1");

      expect(tagged[0].truncationParent).toBeUndefined();
      expect(tagged[1].truncationParent).toBe("trunc-1");
      expect(tagged[2].truncationParent).toBe("trunc-1");
      expect(tagged[3].truncationParent).toBe("trunc-1");
      expect(tagged[4].truncationParent).toBeUndefined();
    });
  });

  describe("removeCondensationTags", () => {
    it("should remove condense tags and summary", () => {
      const messages: ChatMessage[] = [
        {
          id: "s1",
          role: "system",
          content: "Summary",
          condenseId: "c1",
          metadata: { isSummary: true },
          timestamp: new Date().toISOString(),
        },
        {
          id: "m0",
          role: "user",
          content: "Msg 0",
          condenseParent: "c1",
          timestamp: new Date().toISOString(),
        },
        {
          id: "m1",
          role: "assistant",
          content: "Msg 1",
          condenseParent: "c1",
          timestamp: new Date().toISOString(),
        },
        {
          id: "m2",
          role: "user",
          content: "Msg 2",
          timestamp: new Date().toISOString(),
        },
      ];

      const result = removeCondensationTags(messages, "c1");
      expect(result).toHaveLength(3); // summary removed, 2 uncondensed + 1 regular
      expect(result[0].condenseParent).toBeUndefined();
      expect(result[0].id).toBe("m0");
    });
  });

  describe("removeTruncationTags", () => {
    it("should remove truncation tags and marker", () => {
      const messages: ChatMessage[] = [
        {
          id: "m0",
          role: "user",
          content: "Msg 0",
          timestamp: new Date().toISOString(),
        },
        {
          id: "t1",
          role: "system",
          content: "Truncated",
          truncationId: "tr1",
          isTruncationMarker: true,
          timestamp: new Date().toISOString(),
        },
        {
          id: "m1",
          role: "user",
          content: "Msg 1",
          truncationParent: "tr1",
          timestamp: new Date().toISOString(),
        },
        {
          id: "m2",
          role: "assistant",
          content: "Msg 2",
          truncationParent: "tr1",
          timestamp: new Date().toISOString(),
        },
        {
          id: "m3",
          role: "user",
          content: "Msg 3",
          timestamp: new Date().toISOString(),
        },
      ];

      const result = removeTruncationTags(messages, "tr1");
      expect(result).toHaveLength(4); // marker removed, 2 untruncated + 2 regular
      expect(result.find((m) => m.isTruncationMarker)).toBeUndefined();
      expect(result[1].truncationParent).toBeUndefined();
    });
  });
});
