export type BadgeType =
  | "new"
  | "updated"
  | "beta"
  | "deprecated"
  | "experimental";

const validBadgeTypes = new Set<BadgeType>([
  "new",
  "updated",
  "beta",
  "deprecated",
  "experimental",
]);

export const VALID_BADGE_TYPES: ReadonlySet<BadgeType> = validBadgeTypes;

export function isBadgeType(
  value: string | null | undefined,
): value is BadgeType {
  return value != null && validBadgeTypes.has(value as BadgeType);
}
