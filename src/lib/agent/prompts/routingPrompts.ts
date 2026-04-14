/**
 * Routing Prompts for Agent Network
 *
 * These prompts guide the routing agent in selecting the appropriate
 * primitive (agent, workflow, or tool) for a given task.
 */

import type { Primitive, AgentRoutingDecision } from "../../types/index.js";

/**
 * Prompt templates for routing decisions
 */
export const ROUTING_PROMPTS = {
  /**
   * System instructions for the routing agent
   */
  SYSTEM_INSTRUCTIONS: `You are a task routing agent responsible for analyzing tasks and selecting the best primitive to handle them.

Your role is to:
1. Analyze the incoming task to understand what needs to be done
2. Review the available primitives (agents, workflows, tools)
3. Select the most appropriate primitive based on capabilities
4. Format the input appropriately for the selected primitive
5. Provide your reasoning and confidence level

Always respond in valid JSON format.`,

  /**
   * Template for task analysis and routing
   */
  TASK_ROUTING: `Analyze the following task and select the most appropriate primitive to handle it.

Available Primitives:
{{PRIMITIVES}}

Task to route:
{{TASK}}

Consider:
1. The primitive's description and capabilities
2. The complexity of the task
3. Required tools or skills
4. Expected output format

Respond in JSON format:
{
  "selectedPrimitive": {
    "type": "agent" | "workflow" | "tool",
    "id": "<primitive_id>",
    "name": "<primitive_name>"
  },
  "confidence": <0.0-1.0>,
  "reasoning": "<explanation of why this primitive was chosen>",
  "formattedInput": "<the input formatted for the selected primitive>",
  "alternatives": [
    {
      "type": "agent" | "workflow" | "tool",
      "id": "<alternative_id>",
      "confidence": <0.0-1.0>
    }
  ]
}`,

  /**
   * Template for confidence evaluation
   */
  CONFIDENCE_EVALUATION: `Evaluate the confidence that the selected primitive can successfully complete the task.

Selected Primitive:
- Type: {{PRIMITIVE_TYPE}}
- Name: {{PRIMITIVE_NAME}}
- Description: {{PRIMITIVE_DESCRIPTION}}

Task: {{TASK}}

Rate the confidence from 0.0 to 1.0 based on:
- How well the primitive's capabilities match the task
- The specificity of the primitive's description
- The complexity of the task vs primitive's scope
- Potential edge cases or limitations`,

  /**
   * Template for multi-step planning
   */
  MULTI_STEP_PLANNING: `Plan the execution of this complex task that may require multiple primitives.

Task: {{TASK}}

Available Primitives:
{{PRIMITIVES}}

Create an execution plan with the following structure:
{
  "isMultiStep": true/false,
  "steps": [
    {
      "stepNumber": 1,
      "primitiveId": "<primitive_id>",
      "description": "<what this step accomplishes>",
      "dependsOn": [<step numbers this depends on>]
    }
  ],
  "expectedOutcome": "<description of final result>"
}`,
};

/**
 * Build a routing prompt with primitives and task
 *
 * @param task - The task to route
 * @param primitives - Available primitives
 * @param options - Additional options
 * @returns The formatted prompt
 */
export function buildRoutingPrompt(
  task: string,
  primitives: Primitive[],
  options?: {
    includeAlternatives?: boolean;
    maxPrimitivesToShow?: number;
  },
): string {
  const { includeAlternatives = true, maxPrimitivesToShow = 20 } =
    options ?? {};

  // Format primitives list
  const primitivesDescription = primitives
    .slice(0, maxPrimitivesToShow)
    .map((p) => {
      const tools =
        p.type === "agent" && "agent" in p
          ? (p.agent as { tools?: string[] }).tools
          : undefined;
      const toolsInfo =
        tools && tools.length > 0 ? `\n  Tools: ${tools.join(", ")}` : "";
      return `- [${p.type.toUpperCase()}] ${p.id}: ${p.name}\n  Description: ${p.description}${toolsInfo}`;
    })
    .join("\n");

  let prompt = ROUTING_PROMPTS.TASK_ROUTING.replace(
    "{{PRIMITIVES}}",
    primitivesDescription,
  ).replace("{{TASK}}", task);

  if (!includeAlternatives) {
    // Remove alternatives section from expected output
    prompt = prompt.replace(
      `"alternatives": [
    {
      "type": "agent" | "workflow" | "tool",
      "id": "<alternative_id>",
      "confidence": <0.0-1.0>
    }
  ]`,
      "",
    );
  }

  return prompt;
}

/**
 * Parse routing response from LLM
 *
 * @param response - The raw LLM response
 * @returns Parsed routing decision or null if parsing fails
 */
export function parseRoutingResponse(
  response: string,
): Partial<AgentRoutingDecision> | null {
  try {
    // Try to extract JSON from the response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate required fields
    if (
      !parsed.selectedPrimitive ||
      !parsed.selectedPrimitive.id ||
      !parsed.selectedPrimitive.type
    ) {
      return null;
    }

    return {
      selectedPrimitive: {
        type: parsed.selectedPrimitive.type,
        id: parsed.selectedPrimitive.id,
        name: parsed.selectedPrimitive.name || parsed.selectedPrimitive.id,
      },
      confidence:
        typeof parsed.confidence === "number" ? parsed.confidence : 0.8,
      reasoning: parsed.reasoning || "No reasoning provided",
      formattedInput: parsed.formattedInput,
      alternatives: Array.isArray(parsed.alternatives)
        ? parsed.alternatives.map(
            (alt: { type: string; id: string; confidence?: number }) => ({
              type: alt.type,
              id: alt.id,
              confidence:
                typeof alt.confidence === "number" ? alt.confidence : 0.5,
            }),
          )
        : undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Build confidence evaluation prompt
 *
 * @param primitive - The selected primitive
 * @param task - The task being evaluated
 * @returns The formatted prompt
 */
export function buildConfidencePrompt(
  primitive: Primitive,
  task: string,
): string {
  return ROUTING_PROMPTS.CONFIDENCE_EVALUATION.replace(
    "{{PRIMITIVE_TYPE}}",
    primitive.type,
  )
    .replace("{{PRIMITIVE_NAME}}", primitive.name)
    .replace("{{PRIMITIVE_DESCRIPTION}}", primitive.description)
    .replace("{{TASK}}", task);
}

/**
 * Build multi-step planning prompt
 *
 * @param task - The task to plan
 * @param primitives - Available primitives
 * @returns The formatted prompt
 */
export function buildMultiStepPlanningPrompt(
  task: string,
  primitives: Primitive[],
): string {
  const primitivesDescription = primitives
    .map(
      (p) =>
        `- [${p.type.toUpperCase()}] ${p.id}: ${p.name} - ${p.description}`,
    )
    .join("\n");

  return ROUTING_PROMPTS.MULTI_STEP_PLANNING.replace("{{TASK}}", task).replace(
    "{{PRIMITIVES}}",
    primitivesDescription,
  );
}
