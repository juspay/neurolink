import React from "react";
import Category from "@theme-original/DocSidebarItem/Category";
import type CategoryType from "@theme/DocSidebarItem/Category";
import type { WrapperProps } from "@docusaurus/types";
import {
  parseBadgeFromLabel,
  SidebarBadge,
  type BadgeType,
} from "@site/src/components/SidebarBadge";
import { useCategoryBadgeStatus } from "@site/src/theme/hooks/useNewDocs";
import { isBadgeType } from "../badgeUtils";
import {
  Rocket,
  Code,
  Terminal,
  Sparkles,
  Plug,
  Brain,
  GitBranch,
  Eye,
  Server,
  BookOpen,
  ChefHat,
  GraduationCap,
  FolderOpen,
  BookMarked,
  MonitorPlay,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  "Getting Started": Rocket,
  SDK: Code,
  CLI: Terminal,
  Features: Sparkles,
  MCP: Plug,
  Memory: Brain,
  Workflows: GitBranch,
  Observability: Eye,
  Deployment: Server,
  Guides: BookOpen,
  Cookbook: ChefHat,
  Tutorials: GraduationCap,
  Examples: FolderOpen,
  Reference: BookMarked,
  Demos: MonitorPlay,
  Community: Users,
  Development: Wrench,
};

type Props = WrapperProps<typeof CategoryType>;

/**
 * Check if any items in a category (recursively) have a badge marker.
 * This enables badge propagation - parent categories show badges if any child has one.
 */
function hasChildWithBadge(items: Props["item"]["items"]): BadgeType | null {
  for (const item of items) {
    if (item.type === "link") {
      const { badge } = parseBadgeFromLabel(item.label);
      if (badge) return badge;
    } else if (item.type === "category" && item.items) {
      // Check if this category label has a badge
      const { badge: categoryBadge } = parseBadgeFromLabel(item.label);
      if (categoryBadge) return categoryBadge;

      // Recursively check children
      const childBadge = hasChildWithBadge(item.items);
      if (childBadge) return childBadge;
    }
  }
  return null;
}

export default function CategoryWrapper(props: Props): React.ReactElement {
  const { item } = props;
  const { cleanLabel, badge: labelBadge } = parseBadgeFromLabel(item.label);

  // Check if any children have badges (for propagation)
  const childBadge = item.items ? hasChildWithBadge(item.items) : null;

  // Priority: explicit label badge > child badge (propagation)
  const badge: BadgeType | null = labelBadge || childBadge;

  const categoryPath =
    item.href?.replace(/^\/docs\//, "").replace(/\/$/, "") ||
    item.label
      ?.toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "") ||
    "";
  const { status: gitStatus } = useCategoryBadgeStatus(categoryPath);
  const resolvedGitBadge: BadgeType | null = isBadgeType(gitStatus)
    ? gitStatus
    : null;
  const finalBadge: BadgeType | null = badge || resolvedGitBadge;

  // Create a modified item with the clean label
  const modifiedItem = {
    ...item,
    label: cleanLabel,
  };

  // Create modified props with the cleaned item
  const modifiedProps = {
    ...props,
    item: modifiedItem,
  };

  const IconComponent = CATEGORY_ICONS[cleanLabel];

  return (
    <div className="sidebar-category-wrapper">
      <div style={{ display: "flex", alignItems: "center" }}>
        {IconComponent && (
          <span
            aria-hidden="true"
            style={{
              display: "inline-flex",
              marginRight: "6px",
              opacity: 0.6,
              flexShrink: 0,
            }}
          >
            <IconComponent size={14} />
          </span>
        )}
        <Category {...modifiedProps} />
      </div>
      {finalBadge && (
        <span className="sidebar-badge-right">
          <SidebarBadge type={finalBadge} />
        </span>
      )}
    </div>
  );
}
