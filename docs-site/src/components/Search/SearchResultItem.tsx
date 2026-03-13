import React, { forwardRef } from "react";
import DOMPurify from "isomorphic-dompurify";
import type { SearchResult } from "../../hooks/useAlgoliaSearch";
import styles from "./Search.module.css";

interface SearchResultItemProps {
  result: SearchResult;
  isSelected: boolean;
  onClick: () => void;
}

function ResultIcon({ isSelected }: { isSelected: boolean }) {
  return (
    <div className={styles.resultIcon} data-selected={isSelected}>
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M4.5 2h5.586a1 1 0 0 1 .707.293l2.414 2.414a1 1 0 0 1 .293.707V13a1 1 0 0 1-1 1h-8a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1Z"
          stroke="currentColor"
          strokeWidth="1.2"
        />
        <path
          d="M6.5 7h3M6.5 9.5h3"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

function ChevronRight() {
  return (
    <svg
      className={styles.resultChevron}
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M6 4l4 4-4 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export const SearchResultItem = forwardRef<
  HTMLAnchorElement,
  SearchResultItemProps
>(function SearchResultItem({ result, isSelected, onClick }, ref) {
  // Build breadcrumb from hierarchy
  const breadcrumbParts: string[] = [];
  const hierarchy = result._highlightResult?.hierarchy || result.hierarchy;

  if (hierarchy.lvl0) {
    breadcrumbParts.push(
      typeof hierarchy.lvl0 === "string"
        ? hierarchy.lvl0
        : hierarchy.lvl0.value || "",
    );
  }
  if (hierarchy.lvl1) {
    breadcrumbParts.push(
      typeof hierarchy.lvl1 === "string"
        ? hierarchy.lvl1
        : hierarchy.lvl1.value || "",
    );
  }
  if (hierarchy.lvl2) {
    breadcrumbParts.push(
      typeof hierarchy.lvl2 === "string"
        ? hierarchy.lvl2
        : hierarchy.lvl2.value || "",
    );
  }

  // Get title - prefer highlighted version
  const title =
    result._highlightResult?.title?.value || result.title || "Untitled";

  // Get content snippet - prefer highlighted version
  const content = result._highlightResult?.content?.value || result.content;

  // Sanitize HTML to prevent XSS - only allow <mark> tags for highlighting
  const sanitizedTitle = DOMPurify.sanitize(title, {
    ALLOWED_TAGS: ["mark"],
    ALLOWED_ATTR: [],
  });

  const sanitizedContent = DOMPurify.sanitize(content || "", {
    ALLOWED_TAGS: ["mark"],
    ALLOWED_ATTR: [],
  });

  return (
    <a
      ref={ref}
      href={result.url}
      className={styles.resultItem}
      data-selected={isSelected}
      onClick={(e) => {
        e.preventDefault();
        onClick();
      }}
      role="option"
      aria-selected={isSelected}
    >
      <ResultIcon isSelected={isSelected} />
      <div className={styles.resultBody}>
        {breadcrumbParts.length > 0 && (
          <div className={styles.resultBreadcrumb}>
            {breadcrumbParts.map((part, index) => {
              const key = `lvl${index}`;
              return (
                <React.Fragment key={key}>
                  {index > 0 && (
                    <span className={styles.resultBreadcrumbSeparator}>
                      &rsaquo;
                    </span>
                  )}
                  <span
                    dangerouslySetInnerHTML={{
                      __html: DOMPurify.sanitize(part, {
                        ALLOWED_TAGS: ["mark"],
                        ALLOWED_ATTR: [],
                      }),
                    }}
                  />
                </React.Fragment>
              );
            })}
          </div>
        )}
        <div
          className={styles.resultTitle}
          dangerouslySetInnerHTML={{ __html: sanitizedTitle }}
        />
        {content && (
          <div
            className={styles.resultContent}
            dangerouslySetInnerHTML={{ __html: sanitizedContent }}
          />
        )}
      </div>
      <ChevronRight />
    </a>
  );
});
