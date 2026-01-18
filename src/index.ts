#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const API_BASE = "https://inspector.gridinsoft.com/mcp/v1";

interface ToolResult {
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
}

async function callAPI(
  endpoint: string,
  apiKey: string,
  body?: object
): Promise<unknown> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: body ? "POST" : "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API error (${response.status}): ${error}`);
  }

  return response.json();
}

async function main() {
  const apiKey = process.env.GRIDINSOFT_API_KEY;

  if (!apiKey) {
    console.error("Error: GRIDINSOFT_API_KEY environment variable is required");
    console.error("Get your API key at: https://inspector.gridinsoft.com/profile");
    console.error("");
    console.error("Usage:");
    console.error("  GRIDINSOFT_API_KEY=your_key npx @gridinsoft/mcp-inspector");
    process.exit(1);
  }

  const server = new Server(
    {
      name: "gridinsoft-inspector",
      version: "1.0.1",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // List available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: "inspect_domain",
          description:
            "Analyze a site for security, reputation, and to determine if it safe and can be trusted",
          inputSchema: {
            type: "object" as const,
            properties: {
              domain: {
                type: "string",
                description: "Domain name to analyze (e.g., 'example.com')",
              },
            },
            required: ["domain"],
          },
        },
        {
          name: "scan_url",
          description:
            "Scan a URL for phishing, malware, and other threats to verify if the site is safe to visit. More thorough than domain inspection.",
          inputSchema: {
            type: "object" as const,
            properties: {
              url: {
                type: "string",
                description: "Full URL to scan (e.g., 'https://example.com/page')",
              },
            },
            required: ["url"],
          },
        },
        {
          name: "get_balance",
          description:
            "Check your remaining API credits and subscription plan status.",
          inputSchema: {
            type: "object" as const,
            properties: {},
          },
        },
      ],
    };
  });

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      const result = await callAPI("/tools/call", apiKey, {
        name,
        arguments: args || {},
      }) as any;

      return {
        content: result.content,
        isError: result.isError
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: "text", text: `Error: ${message}` }],
        isError: true,
      };
    }
  });

  // Start server
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
