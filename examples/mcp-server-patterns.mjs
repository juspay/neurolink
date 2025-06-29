#!/usr/bin/env node

/**
 * MCP Server Patterns Example
 * Demonstrates correct patterns for creating custom MCP servers using @modelcontextprotocol/sdk v1.13.0
 * 
 * This file shows:
 * 1. Basic server setup with McpServer
 * 2. Simple tools with different parameter types  
 * 3. Tools with optional parameters
 * 4. Tools with complex validation
 * 5. Error handling patterns
 * 6. Async operations
 * 7. Proper stdio transport setup
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

// Create the MCP server
const server = new McpServer(
  {
    name: "mcp-patterns-example",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
      logging: {},
    },
  }
);

// Pattern 1: Simple tool with no parameters
server.tool(
  'ping',
  'Simple ping tool that returns pong',
  async () => {
    return {
      content: [
        {
          type: "text",
          text: "pong"
        }
      ]
    };
  }
);

// Pattern 2: Tool with string parameter and validation
server.tool(
  'echo',
  'Echoes back the provided message',
  {
    message: z.string().min(1).describe('Message to echo back')
  },
  async ({ message }) => {
    return {
      content: [
        {
          type: "text",
          text: `Echo: ${message}`
        }
      ]
    };
  }
);

// Pattern 3: Tool with multiple parameters and optional values
server.tool(
  'user_info',
  'Creates a user info summary',
  {
    name: z.string().describe('User name'),
    age: z.number().min(0).max(150).describe('User age'),
    email: z.string().email().optional().describe('User email (optional)'),
    interests: z.array(z.string()).optional().describe('List of user interests')
  },
  async ({ name, age, email, interests = [] }) => {
    const summary = [
      `Name: ${name}`,
      `Age: ${age}`,
      email ? `Email: ${email}` : 'Email: Not provided',
      `Interests: ${interests.length > 0 ? interests.join(', ') : 'None listed'}`
    ];

    return {
      content: [
        {
          type: "text",
          text: `User Information:\n${summary.join('\n')}`
        }
      ]
    };
  }
);

// Pattern 4: Tool with enum parameters and business logic
server.tool(
  'currency_convert',
  'Converts between currencies (mock exchange rates)',
  {
    amount: z.number().positive().describe('Amount to convert'),
    from: z.enum(['USD', 'EUR', 'GBP', 'JPY']).describe('Source currency'),
    to: z.enum(['USD', 'EUR', 'GBP', 'JPY']).describe('Target currency')
  },
  async ({ amount, from, to }) => {
    // Mock exchange rates (in real implementation, you'd fetch these)
    const rates = {
      USD: { EUR: 0.85, GBP: 0.73, JPY: 110.0, USD: 1.0 },
      EUR: { USD: 1.18, GBP: 0.86, JPY: 129.5, EUR: 1.0 },
      GBP: { USD: 1.37, EUR: 1.16, JPY: 150.7, GBP: 1.0 },
      JPY: { USD: 0.009, EUR: 0.0077, GBP: 0.0066, JPY: 1.0 }
    };

    if (from === to) {
      return {
        content: [
          {
            type: "text",
            text: `${amount} ${from} = ${amount} ${to} (same currency)`
          }
        ]
      };
    }

    const rate = rates[from][to];
    const converted = (amount * rate).toFixed(2);

    return {
      content: [
        {
          type: "text",
          text: `${amount} ${from} = ${converted} ${to} (rate: ${rate})`
        }
      ]
    };
  }
);

// Pattern 5: Tool with error handling and validation
server.tool(
  'divide_numbers',
  'Divides two numbers with proper error handling',
  {
    dividend: z.number().describe('Number to be divided'),
    divisor: z.number().describe('Number to divide by')
  },
  async ({ dividend, divisor }) => {
    if (divisor === 0) {
      return {
        content: [
          {
            type: "text",
            text: "Error: Cannot divide by zero"
          }
        ],
        isError: true
      };
    }

    const result = dividend / divisor;
    
    return {
      content: [
        {
          type: "text",
          text: `${dividend} ÷ ${divisor} = ${result}`
        }
      ]
    };
  }
);

// Pattern 6: Async tool that simulates network operation
server.tool(
  'fetch_data',
  'Simulates fetching data with delay',
  {
    url: z.string().url().describe('URL to fetch data from'),
    timeout: z.number().min(100).max(10000).default(1000).describe('Timeout in milliseconds')
  },
  async ({ url, timeout }) => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, timeout));
    
    // Mock response based on URL
    const mockData = {
      url: url,
      status: 200,
      data: `Mock data from ${url}`,
      timestamp: new Date().toISOString(),
      responseTime: `${timeout}ms`
    };

    return {
      content: [
        {
          type: "text",
          text: `Fetched data:\n${JSON.stringify(mockData, null, 2)}`
        }
      ]
    };
  }
);

// Pattern 7: Tool with complex object parameter
server.tool(
  'process_order',
  'Processes a customer order',
  {
    customer: z.object({
      name: z.string(),
      email: z.string().email()
    }).describe('Customer information'),
    items: z.array(z.object({
      product: z.string(),
      quantity: z.number().positive(),
      price: z.number().positive()
    })).min(1).describe('Order items'),
    shipping: z.object({
      address: z.string(),
      method: z.enum(['standard', 'express', 'overnight'])
    }).describe('Shipping information')
  },
  async ({ customer, items, shipping }) => {
    const total = items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    const orderSummary = items.map(item => 
      `${item.quantity}x ${item.product} @ $${item.price} = $${item.quantity * item.price}`
    ).join('\n');

    const response = [
      `Order processed for ${customer.name} (${customer.email})`,
      '',
      'Items:',
      orderSummary,
      '',
      `Subtotal: $${total.toFixed(2)}`,
      `Shipping (${shipping.method}): ${shipping.address}`,
      '',
      `Order ID: ORD-${Date.now()}`
    ].join('\n');

    return {
      content: [
        {
          type: "text",
          text: response
        }
      ]
    };
  }
);

// Pattern 8: Tool that uses notifications (if supported by client)
server.tool(
  'long_running_task',
  'Simulates a long-running task with progress updates',
  {
    steps: z.number().min(1).max(10).default(5).describe('Number of steps to process'),
    delay: z.number().min(100).max(2000).default(500).describe('Delay between steps in ms')
  },
  async ({ steps, delay }, { sendNotification }) => {
    try {
      await sendNotification?.({
        method: "notifications/message",
        params: {
          level: "info",
          data: `Starting long-running task with ${steps} steps`
        }
      });
    } catch (e) {
      // Notifications not supported by client, continue anyway
    }

    for (let i = 1; i <= steps; i++) {
      await new Promise(resolve => setTimeout(resolve, delay));
      
      try {
        await sendNotification?.({
          method: "notifications/message", 
          params: {
            level: "info",
            data: `Completed step ${i}/${steps}`
          }
        });
      } catch (e) {
        // Notifications not supported, continue anyway
      }
    }

    return {
      content: [
        {
          type: "text",
          text: `Task completed! Processed ${steps} steps with ${delay}ms delay between each.`
        }
      ]
    };
  }
);

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("MCP Server Patterns Example started successfully");
  console.error(`Registered ${Object.keys(server._registeredTools || {}).length} tools`);
}

main().catch((error) => {
  console.error("Failed to start MCP server:", error);
  process.exit(1);
});