# LangGraph Documentation

## Table of Contents

- [Overview](#overview)
- [Core Capabilities](#core-capabilities)
- [Fundamental Components](#fundamental-components)
  - [Graph](#graph)
  - [State](#state)
  - [Nodes](#nodes)
  - [Edges](#edges)
  - [StateGraph](#stategraph)
  - [Messages](#messages)
  - [Reducers](#reducers)
- [Getting Started](#getting-started)
  - [Basic Usage Pattern](#basic-usage-pattern)
  - [Simple Example](#simple-example)
- [Advanced Features](#advanced-features)
  - [Human-in-the-Loop](#human-in-the-loop)
  - [State Persistence](#state-persistence)
  - [Streaming Processing](#streaming-processing)
  - [Conditional Logic](#conditional-logic)
- [Use Cases](#use-cases)

---

## Overview

**LangGraph** is a powerful framework for agent development that allows you to focus on your application's logic and behavior, instead of building and maintaining the supporting infrastructure for state, memory, and human feedback.

If your application involves a series of steps that need to be orchestrated in a specific way, with decisions being made at each junction point, LangGraph provides the structure you need.

### Why Choose LangGraph?

- **Graph-Based Architecture**: Model complex workflows as directed graphs
- **State Management**: Automatic state persistence and management
- **Human Integration**: Seamless human-in-the-loop capabilities
- **Streaming Support**: Real-time feedback and processing
- **Flexible Control Flow**: Support for conditional logic and loops

---

## Core Capabilities

### Looping and Branching

Supports conditional flow and looping statements with correct execution of workflows, enabling complex decision trees and iterative processes.

### State Persistence

Automatically saves and manages state, supporting pause and resume for long-running conversations and workflows.

### Human-in-the-Loop

Allows inserting human review during execution, supporting state editing and modification with flexible interaction control mechanisms.

### Streaming Processing

Supports streaming output and real-time feedback on execution status to enhance user experience and provide immediate feedback.

---

## Fundamental Components

LangGraph provides a framework for defining, coordinating, and executing multiple LLM agents (or chains) in a structured manner.

### Graph Structure

Imagine your application as a directed graph. In LangGraph, each node represents an LLM agent, and the edges are the communication channels between these agents. This structure allows for clear and manageable workflows, where each agent performs specific tasks and passes information to other agents as needed.

### Graph

A graph is the orchestrator of our workflow. It combines the three core components — State, Nodes, and Edges — into a structured, executable system.

**Key Responsibilities:**

- Workflow orchestration
- Component coordination
- Execution flow management
- State transitions

### State

State is user-defined and maintained and passed between nodes during execution. When deciding which node to target next, this is the current state that we look at.

**Key Differences from LangChain:**

- In **LangChain**: Control flow requires manual glue code with loops and conditional statements
- In **LangGraph**: Nodes and edges automatically control the flow based on state

**State Characteristics:**

- **Mutable**: Each node can read and write data to the state
- **Persistent**: Automatically maintained across workflow execution
- **Flexible**: User-defined structure to match application needs
- **Contextual**: Carries information between processing steps

### Nodes

Nodes represent individual processing steps such as:

- Calling an LLM
- Using a tool
- Making a decision
- Processing data

**Node Features:**

- **State Access**: Each node receives the current state as input
- **State Modification**: Nodes can update the state for subsequent steps
- **Error Handling**: Built-in error management and recovery

### Edges

An edge defines the flow of execution — how state is passed between nodes, and when the graph begins and ends. Edges connect nodes and determine how execution moves after a node finishes processing.

#### Types of Edges

##### Normal Edges

`a -> b` - Straightforward links from one node to another with unconditional flow.

##### Conditional Edges

Control flow depending on the current state. They use a function to decide which nodes to trigger next, enabling:

- Dynamic routing
- Decision-based branching
- State-dependent flow control

##### START & END Edges

Designate entry and termination points for the workflow:

- **START**: Entry point for workflow execution
- **END**: Termination point when workflow completes

### StateGraph

The StateGraph class in LangGraph is the primary way to build stateful, graph-based workflows.

**Development Process:**

1. **Define State**: Specify the structure of your workflow state
2. **Add Nodes**: Create processing components
3. **Define Edges**: Establish flow connections
4. **Compile**: Validate and prepare for execution

**Compilation Benefits:**

- Structure validation
- Orphan node detection
- Flow optimization
- Error prevention

### Messages

A message is a unit of communication used primarily in chat models and workflows.

**Message System:**

- `messages` refers to a special state channel used to track conversations
- Maintains conversation history as a list of chat-like messages
- Uses LangChain BaseMessage subclasses:
  - `HumanMessage`: User input
  - `AIMessage`: AI responses
  - `SystemMessage`: System instructions
  - `ToolMessage`: Tool outputs
  - `FunctionMessage`: Function results

### Reducers

Reducers are key to understanding how updates from nodes are applied to the State.

**Reducer Functions:**

- Control how state updates are merged
- Handle concurrent state modifications
- Ensure state consistency
- Enable complex state management patterns

---

## Getting Started

### Basic Usage Pattern

The fundamental workflow for using LangGraph:

1. **Define State Model**: Specify your application's state structure
2. **Create Processing Nodes**: Implement individual workflow steps
3. **Build Graph Structure**: Connect nodes with edges
4. **Define Routing Logic**: Implement conditional flow controls
5. **Compile and Run**: Execute your workflow

### Simple Example

Here's a basic LangGraph implementation:

```javascript
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { StateGraph, Annotation, START, END } from "@langchain/langgraph";

// Initialize the AI model
const model = new ChatGoogleGenerativeAI({
  apiKey: "your-api-key",
  model: "gemini-1.5-flash",
});

// Define the state structure
const GraphState = Annotation.Root({
  history: Annotation({
    reducer: (x, y) => (x ?? []).concat(y),
    default: () => [],
  }),
  input: Annotation(),
  output: Annotation(),
});

// Create a processing node
async function askNode(state) {
  const response = await model.invoke(state.input);
  return {
    history: [`User: ${state.input}`, `AI: ${response.content}`],
    output: response.content,
  };
}

// Build the graph
const builder = new StateGraph(GraphState)
  .addNode("ask", askNode)
  .addEdge(START, "ask")
  .addEdge("ask", END);

// Compile and execute
const graph = builder.compile();

const result = await graph.invoke({
  input: "Hello!!",
});

console.log(result);
```

---

## Advanced Features

### Human-in-the-Loop

LangGraph supports sophisticated human intervention patterns:

```javascript
// Enable human interrupts
const workflow = graph.compile({
  interruptBefore: ["humanReview"],
  interruptAfter: ["analysis"],
});
```

**Use Cases:**

- Quality control checkpoints
- Decision validation
- Content review
- Error correction

---

## Troubleshooting

### Common Issues

**Orphan Nodes**: Ensure all nodes are connected to the workflow
**State Conflicts**: Use reducers to handle concurrent state updates
**Infinite Loops**: Design proper exit conditions for conditional edges
**Memory Issues**: Monitor state size in long-running workflows

### Debugging Strategies

1. **Step-by-Step Execution**: Use checkpoints to examine state at each step
2. **Logging**: Add comprehensive logging throughout workflows
3. **State Inspection**: Regularly inspect state structure and content
4. **Flow Visualization**: Create diagrams to understand workflow structure

---
