import { useVirtualizer } from "@tanstack/react-virtual";
import React, { useCallback, useEffect, useMemo, useRef } from "react";
import type { SearchResult } from "../../hooks/useAlgoliaSearch";
import styles from "./Search.module.css";
import { SearchResultItem } from "./SearchResultItem";

interface SearchResultsProps {
  results: SearchResult[];
  selectedIndex: number;
  onSelect: (result: SearchResult) => void;
  onSelectedIndexChange: (index: number) => void;
}

interface GroupedResults {
  group: string;
  items: SearchResult[];
}

function groupResultsByHierarchy(results: SearchResult[]): GroupedResults[] {
  const groups = new Map<string, SearchResult[]>();

  for (const result of results) {
    const groupKey = result.hierarchy?.lvl0 || "Other";
    const existing = groups.get(groupKey) || [];
    existing.push(result);
    groups.set(groupKey, existing);
  }

  return Array.from(groups.entries()).map(([group, items]) => ({
    group,
    items,
  }));
}

export function SearchResults({
  results,
  selectedIndex,
  onSelect,
  onSelectedIndexChange,
}: SearchResultsProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const groupedResults = groupResultsByHierarchy(results);

  // Flatten results for virtualization while keeping track of indices
  const flatItems = useMemo(() => {
    const items: Array<
      | { type: "header"; group: string }
      | { type: "result"; result: SearchResult; flatIndex: number }
    > = [];
    let flatIndex = 0;

    for (const { group, items: groupItems } of groupedResults) {
      items.push({ type: "header", group });
      for (const result of groupItems) {
        items.push({ type: "result", result, flatIndex });
        flatIndex++;
      }
    }

    return items;
  }, [groupedResults]);

  const rowVirtualizer = useVirtualizer({
    count: flatItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: useCallback(
      (index: number) => {
        const item = flatItems[index];
        return item?.type === "header" ? 32 : 120;
      },
      [flatItems],
    ),
    overscan: 5,
    measureElement: (element) => element.getBoundingClientRect().height,
  });

  // Scroll selected item into view
  useEffect(() => {
    if (selectedIndex >= 0 && selectedIndex < results.length) {
      // Find the virtual index for the selected result
      let virtualIndex = 0;
      let resultCount = 0;
      for (const item of flatItems) {
        if (item.type === "result") {
          if (resultCount === selectedIndex) {
            rowVirtualizer.scrollToIndex(virtualIndex, { align: "auto" });
            break;
          }
          resultCount++;
        }
        virtualIndex++;
      }
    }
  }, [selectedIndex, results.length, flatItems, rowVirtualizer]);

  // Handle mouse hover to update selected index
  const handleMouseEnter = (index: number) => {
    onSelectedIndexChange(index);
  };

  if (results.length === 0) {
    return null;
  }

  return (
    <div
      ref={parentRef}
      className={styles.results}
      role="listbox"
      aria-label="Search results"
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const item = flatItems[virtualRow.index];

          if (item?.type === "header") {
            return (
              <div
                key={`header-${item.group}`}
                ref={rowVirtualizer.measureElement}
                data-index={virtualRow.index}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <div className={styles.resultsGroupHeader}>{item.group}</div>
              </div>
            );
          }

          if (item?.type === "result") {
            const isSelected = item.flatIndex === selectedIndex;

            return (
              <div
                key={item.result.objectID}
                ref={rowVirtualizer.measureElement}
                data-index={virtualRow.index}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  transform: `translateY(${virtualRow.start}px)`,
                }}
                onMouseEnter={() => handleMouseEnter(item.flatIndex)}
              >
                <SearchResultItem
                  result={item.result}
                  isSelected={isSelected}
                  onClick={() => onSelect(item.result)}
                />
              </div>
            );
          }

          return null;
        })}
      </div>
    </div>
  );
}
