/**
 * Summarization Prompt Builder
 *
 * Builds prompts for summarizing conversation context into a 9-section structure.
 * Supports both initial summarization and incremental merging with existing summaries.
 */

import type { SummarizationPromptOptions } from "../../types/contextTypes.js";

export type { SummarizationPromptOptions } from "../../types/contextTypes.js";

const NINE_SECTIONS = [
  "Primary Request and Intent",
  "Key Technical Concepts",
  "Files and Code Sections",
  "Problem Solving",
  "Pending Tasks",
  "Task Evolution",
  "Current Work",
  "Next Step",
  "Required Files",
];

function buildFileContextSection(
  filesRead?: string[],
  filesModified?: string[],
): string {
  const hasFiles =
    (filesRead && filesRead.length > 0) ||
    (filesModified && filesModified.length > 0);

  if (!hasFiles) {
    return "";
  }

  let section = "\n\nFile Context:\n";

  if (filesRead && filesRead.length > 0) {
    section += "Files Read:\n";
    for (const file of filesRead) {
      section += `- ${file}\n`;
    }
  }

  if (filesModified && filesModified.length > 0) {
    section += "Files Modified:\n";
    for (const file of filesModified) {
      section += `- ${file}\n`;
    }
  }

  return section;
}

function buildInitialPrompt(options: SummarizationPromptOptions): string {
  const fileContext = buildFileContextSection(
    options.filesRead,
    options.filesModified,
  );

  return `You are a context summarization assistant. Your task is to analyze the conversation and create a structured summary following a 9-section format.

Create a summary with the following sections:

### 1. Primary Request and Intent
What is the user's main goal or request? What are they trying to accomplish?

### 2. Key Technical Concepts
What technologies, frameworks, patterns, or concepts are central to this conversation?

### 3. Files and Code Sections
What specific files, functions, or code sections have been discussed or modified?

### 4. Problem Solving
What problems were identified? What solutions were attempted or implemented?

### 5. Pending Tasks
What tasks remain incomplete or need follow-up?

### 6. Task Evolution
How has the task changed or evolved during the conversation?

### 7. Current Work
What is being actively worked on right now?

### 8. Next Step
What is the immediate next action to take?

### 9. Required Files
What files will need to be accessed or modified to continue?${fileContext}

Analyze the conversation thoroughly and fill in each section with relevant information. If a section is not applicable, write "N/A" for that section.`;
}

function buildIncrementalPrompt(options: SummarizationPromptOptions): string {
  const fileContext = buildFileContextSection(
    options.filesRead,
    options.filesModified,
  );

  return `You are a context summarization assistant. Your task is to MERGE new conversation content with an existing summary.

Existing Summary:
---
${options.previousSummary}
---

Update sections with new information while preserving important context from the existing summary. Maintain the same 9-section structure.

Instructions:
1. Review the existing summary above
2. Analyze the new conversation content
3. MERGE the new information into the appropriate sections
4. Update sections with relevant new information
5. Remove information that is no longer relevant
6. Keep the summary concise but comprehensive
7. Maintain the 9-section format${fileContext}

Output the updated summary following the same 9-section structure.`;
}

/**
 * Builds a summarization prompt based on the provided options.
 *
 * @param options - Configuration for the prompt builder
 * @returns The constructed prompt string
 */
export function buildSummarizationPrompt(
  options: SummarizationPromptOptions,
): string {
  // For incremental mode, we need a previous summary to merge with
  // If no previous summary is provided, fall back to initial prompt
  if (options.isIncremental && options.previousSummary) {
    return buildIncrementalPrompt(options);
  }

  return buildInitialPrompt(options);
}

export { NINE_SECTIONS };
