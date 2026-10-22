#!/usr/bin/env node

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { InspectorApi, DEFAULT_TIMEOUT_MS } from "./api.js";
import { callTool, createServer, VERSION } from "./server.js";

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 1 && ["--help", "-h"].includes(args[0])) {
    console.log(`GridinSoft Inspector MCP Server v${VERSION}

Usage:
  mcp-inspector                  Start the MCP server (stdio)
  mcp-inspector check DOMAIN      Check domain reputation
  mcp-inspector inspect DOMAIN    Alias for check
  mcp-inspector scan URL          Scan a URL
  mcp-inspector --help            Show this help message
  mcp-inspector --version         Show version information

Environment Variables:
  GRIDINSOFT_API_KEY      API key from https://inspector.gridinsoft.com/profile
  GRIDINSOFT_TIMEOUT_MS   HTTP timeout in milliseconds (default: ${DEFAULT_TIMEOUT_MS})

For URL scans, configure your MCP client's request timeout to at least 120 seconds.`);
    return;
  }
  if (args.length === 1 && ["--version", "-v"].includes(args[0])) {
    console.log(VERSION);
    return;
  }
  if (args.length > 0 && (args.length !== 2 || !["check", "inspect", "scan"].includes(args[0]) || !args[1].trim())) {
    throw new Error("Invalid arguments. Use --help for usage.");
  }

  const timeoutValue = process.env.GRIDINSOFT_TIMEOUT_MS;
  const api = new InspectorApi({
    apiKey: process.env.GRIDINSOFT_API_KEY ?? "",
    timeoutMs: timeoutValue === undefined ? undefined : Number(timeoutValue),
  });
  if (args.length === 2) {
    const scan = args[0] === "scan";
    const result = await callTool(api, scan ? "scan_url" : "inspect_domain", { [scan ? "url" : "domain"]: args[1] });
    console.log(JSON.stringify(result, null, 2));
    if (result.isError) process.exitCode = 1;
    return;
  }
  if (process.stdin.isTTY) {
    throw new Error("This server is intended to be run by an MCP client using stdio. Use --help for CLI usage.");
  }
  await createServer(api).connect(new StdioServerTransport());
}

main().catch((error: unknown) => {
  console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
