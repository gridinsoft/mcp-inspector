#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const API_BASE = "https://inspector.gridinsoft.com/mcp/v1";

async function callAPI(
  endpoint: string,
  apiKey: string,
  body?: object
): Promise<unknown> {
  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    method: body ? "POST" : "GET",
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
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
  const apiKey = process.env.GRIDINSOFT_API_KEY || "";

  const server = new Server(
    {
      name: "gridinsoft-inspector",
      version: "1.0.5",
    },
    {
      capabilities: {
        tools: {},
        prompts: {},
        resources: {},
      },
    }
  );

  // List available tools (dynamically from server)
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    try {
      const response = await callAPI("/tools", apiKey) as any;
      // Filter tools to ensure strict compliance with MCP spec (remove 'cost' etc)
      if (response && Array.isArray(response.tools)) {
        return {
          tools: response.tools.map((tool: any) => ({
            name: tool.name,
            description: tool.description,
            inputSchema: tool.inputSchema,
          }))
        };
      }
      return response;
    } catch (error) {
      return { tools: [] };
    }
  });

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    if (!apiKey) {
      return {
        content: [{ 
          type: "text", 
          text: "Error: GRIDINSOFT_API_KEY is not set. Please get your API key at https://inspector.gridinsoft.com/profile and add it to your configuration." 
        }],
        isError: true,
      };
    }

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

  // List available prompts
  server.setRequestHandler(ListPromptsRequestSchema, async () => {
    try {
      return await callAPI("/prompts", apiKey) as any;
    } catch (error) {
      return { prompts: [] };
    }
  });

  // Get specific prompt
  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    try {
      return await callAPI(`/prompts/get?name=${encodeURIComponent(request.params.name)}`, apiKey) as any;
    } catch (error) {
      throw new Error(`Error fetching prompt details`);
    }
  });

  // List available resources
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    try {
      return await callAPI("/resources", apiKey) as any;
    } catch (error) {
      return { resources: [] };
    }
  });

  // Read specific resource
  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    try {
      return await callAPI(`/resources/read?uri=${encodeURIComponent(request.params.uri)}`, apiKey) as any;
    } catch (error) {
      throw new Error(`Error reading resource`);
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
