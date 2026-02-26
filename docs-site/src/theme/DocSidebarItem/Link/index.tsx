import React from "react";
import Link from "@theme-original/DocSidebarItem/Link";
import type LinkType from "@theme/DocSidebarItem/Link";
import type { WrapperProps } from "@docusaurus/types";
import {
  parseBadgeFromLabel,
  SidebarBadge,
  type BadgeType,
} from "@site/src/components/SidebarBadge";
import { useDocStatus } from "@site/src/theme/hooks/useNewDocs";
import { isBadgeType } from "../badgeUtils";

type Props = WrapperProps<typeof LinkType>;

export default function LinkWrapper(props: Props): React.ReactElement {
  const { item } = props;
  const { cleanLabel, badge } = parseBadgeFromLabel(item.label);
  const { status: gitStatus } = useDocStatus(item.docId || item.href || "");
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

  return (
    <div className="sidebar-link-wrapper">
      <div>
        <Link {...modifiedProps} />
      </div>
      {finalBadge && (
        <span className="sidebar-badge-right">
          <SidebarBadge type={finalBadge} />
        </span>
      )}
    </div>
  );
}
