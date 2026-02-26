import React from "react";
import Tabs from "@theme/Tabs";
import TabItem from "@theme/TabItem";
import styles from "./CodeTabs.module.css";

const PROVIDER_LABELS: Record<string, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  google: "Google AI",
  bedrock: "AWS Bedrock",
  azure: "Azure",
  vertex: "Vertex AI",
  mistral: "Mistral",
  ollama: "Ollama",
  litellm: "LiteLLM",
  huggingface: "HuggingFace",
};

type CodeTabsProps = {
  children: React.ReactNode;
  labels: string[];
  groupId?: string;
};

export function CodeTabs({
  children,
  labels,
  groupId = "provider",
}: CodeTabsProps) {
  const normalizedChildren = React.Children.toArray(children);

  if (
    process.env.NODE_ENV !== "production" &&
    normalizedChildren.length > labels.length
  ) {
    console.warn(
      `CodeTabs: ${normalizedChildren.length - labels.length} extra children without corresponding labels`,
    );
  }

  return (
    <div className={styles.wrapper}>
      <Tabs groupId={groupId} className={styles.tabs}>
        {labels
          .map((label, index) => ({
            label,
            child: normalizedChildren[index],
            index,
          }))
          .filter(({ label, child, index }) => {
            if (child === undefined) {
              if (process.env.NODE_ENV !== "production") {
                console.warn(
                  `CodeTabs: Missing child for label "${label}" at index ${index}`,
                );
              }
              return false;
            }
            return true;
          })
          .map(({ label, child }) => {
            const displayLabel = PROVIDER_LABELS[label] || label;
            return (
              <TabItem key={label} value={label} label={displayLabel}>
                {child}
              </TabItem>
            );
          })}
      </Tabs>
    </div>
  );
}

export default CodeTabs;
