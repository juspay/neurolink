/**
 * Pure index-filtering + prompt-index formatting helpers.
 *
 * Matching semantics are ported from curator's battle-tested
 * `searchSkillsFromIndex`: case-insensitive substring match on
 * name/displayName/description, optional tag filter on top, scope filter
 * that always admits global skills, and active-only visibility.
 */

import type {
  SkillDefinition,
  SkillIndexItem,
  SkillSearchQuery,
} from "../types/index.js";

/** Strip instructions from a full definition to form an index entry. */
export function toSkillIndexItem(skill: SkillDefinition): SkillIndexItem {
  const { instructions: _instructions, ...indexItem } = skill;
  return indexItem;
}

/** Filter index entries by query/tag/scope. Active skills only. */
export function filterSkillIndex(
  items: SkillIndexItem[],
  query: SkillSearchQuery,
): SkillIndexItem[] {
  const lowerQuery = query.query?.toLowerCase();
  const lowerTag = query.tag?.toLowerCase();

  const matched = items.filter((item) => {
    if ((item.status ?? "active") !== "active") {
      return false;
    }

    // Scope filter: global skills always pass; scoped skills require a
    // matching scopeId. When the caller provides no scopeId, scoped skills
    // still pass (curator semantics — unscoped callers see everything).
    if (query.scopeId && item.scope === "scoped") {
      if (!(item.scopeIds ?? []).includes(query.scopeId)) {
        return false;
      }
    }

    if (lowerQuery) {
      const nameMatch =
        item.name.toLowerCase().includes(lowerQuery) ||
        (item.displayName ?? "").toLowerCase().includes(lowerQuery) ||
        item.description.toLowerCase().includes(lowerQuery);
      if (!nameMatch) {
        return false;
      }
    }

    if (lowerTag) {
      const tagMatch = (item.tags ?? []).some((t) =>
        t.toLowerCase().includes(lowerTag),
      );
      if (!tagMatch) {
        return false;
      }
    }

    return true;
  });

  return query.limit !== undefined ? matched.slice(0, query.limit) : matched;
}

/**
 * Render the compact skills index injected into the system prompt.
 * Names + descriptions only — instructions are never included; the model
 * loads them via search_skills. Returns null when nothing is visible so
 * callers can skip injection entirely.
 */
export function formatSkillsPromptIndex(
  items: SkillIndexItem[],
  maxItems: number,
): string | null {
  if (items.length === 0) {
    return null;
  }

  const visible = items.slice(0, maxItems);
  const lines = visible.map((item) => {
    const label = item.displayName
      ? `${item.name} (${item.displayName})`
      : item.name;
    const tags =
      item.tags && item.tags.length > 0
        ? ` [tags: ${item.tags.join(", ")}]`
        : "";
    return `- ${label}: ${item.description}${tags}`;
  });

  const truncationNote =
    items.length > visible.length
      ? `\n(${items.length - visible.length} more skills exist — use search_skills or list_skills to discover them.)`
      : "";

  return (
    [
      "## Available Skills",
      "The following team-defined skills (SOPs, playbooks, workflows) are available.",
      "Before answering from general knowledge, check whether one applies to the user's request.",
      "To use a skill, call the search_skills tool to load its full instructions, then follow them exactly.",
      "",
      ...lines,
    ].join("\n") + truncationNote
  );
}
