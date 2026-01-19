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
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
GridinSoft Inspector MCP Server v1.0.6

Usage:
  mcp-inspector           Start the MCP server (Stdio)
  mcp-inspector --help    Show this help message
  mcp-inspector --version Show version information

Environment Variables:
  GRIDINSOFT_API_KEY      Your API key from https://inspector.gridinsoft.com/profile
    `);
    process.exit(0);
  }

  if (args.includes('--version') || args.includes('-v')) {
    console.log('1.0.6');
    process.exit(0);
  }

  const apiKey = process.env.GRIDINSOFT_API_KEY || "";

  // Handle CLI mode (e.g., npx @gridinsoft/mcp-inspector check example.com)
  const isCheck = args.includes('check') || args.includes('inspect');
  const isScan = args.includes('scan');

  if (isCheck || isScan) {
    const value = args.find(a => !['check', 'inspect', 'scan'].includes(a) && !a.startsWith('-'));
    if (!value) {
      console.error(`Error: Missing ${isCheck ? 'domain' : 'URL'} argument.`);
      process.exit(1);
    }

    if (!apiKey) {
      console.error("Error: GRIDINSOFT_API_KEY environment variable is not set.");
      process.exit(1);
    }

    try {
      let result;
      if (isCheck) {
        result = await callAPI("/tools/call", apiKey, {
          name: "inspect_domain",
          arguments: { domain: value },
        });
      } else {
        result = await callAPI("/tools/call", apiKey, {
          name: "scan_url",
          arguments: { url: value },
        });
      }
      console.log(JSON.stringify(result, null, 2));
      process.exit(0);
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  }

  // Prevent hanging if run in an interactive terminal without arguments
  if (process.stdin.isTTY && args.length === 0) {
    console.error("GridinSoft Inspector MCP Server");
    console.error("Error: This server is intended to be run by an MCP client (stdio transport).");
    console.error("To see available options, run with --help");
    process.exit(1);
  }

  const server = new Server(
    {
      name: "gridinsoft-inspector",
      version: "1.0.6",
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
