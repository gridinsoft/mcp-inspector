import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema, CallToolResultSchema,
  ListToolsRequestSchema, ListToolsResultSchema,
  ListPromptsRequestSchema, ListPromptsResultSchema,
  GetPromptRequestSchema, GetPromptResultSchema,
  ListResourcesRequestSchema, ListResourcesResultSchema,
  ReadResourceRequestSchema, ReadResourceResultSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { ApiError, InspectorApi } from "./api.js";

export const VERSION = "1.0.7";

function failure(error: unknown) {
  return {
    content: [{ type: "text" as const, text: error instanceof Error ? error.message : String(error) }],
    isError: true,
  };
}

export async function callTool(api: InspectorApi, name: string, args: Record<string, unknown>, signal?: AbortSignal) {
  if (!api.apiKey) return failure(new Error("GRIDINSOFT_API_KEY is not set. Get your API key at https://inspector.gridinsoft.com/profile and add it to your configuration."));
  try {
    const result = await api.call("/tools/call", { name, arguments: args }, signal);
    const parsed = parseToolResult(result);
    if (!parsed.success) throw new Error("Inspector API returned an invalid tool result.");
    return parsed.data;
  } catch (error) {
    if (error instanceof ApiError) {
      const parsed = parseToolResult(error.responseBody);
      if (parsed.success && parsed.data.isError === true) return parsed.data;
    }
    return failure(error);
  }
}

function parseToolResult(result: unknown) {
  // The SDK supplies a default content array; require the upstream API to send
  // an actual tool result so unrelated JSON cannot masquerade as success.
  const hasContent = result && typeof result === "object" && "content" in result && Array.isArray(result.content);
  return CallToolResultSchema.safeParse(hasContent ? result : null);
}

function query(endpoint: string, values: Record<string, string | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined) params.set(key, value);
  }
  return params.size ? `${endpoint}?${params}` : endpoint;
}

export function createServer(api: InspectorApi) {
  const server = new Server({ name: "gridinsoft-inspector", version: VERSION }, {
    capabilities: { tools: {}, prompts: {}, resources: {} },
  });

  server.setRequestHandler(ListToolsRequestSchema, async (request, extra) => {
    const result = await api.call(query("/tools", { cursor: request.params?.cursor }), undefined, extra.signal);
    if (result && typeof result === "object" && "tools" in result && Array.isArray(result.tools)) {
      for (const tool of result.tools) {
        // PHP's legacy serialization of an empty property map is [].
        if (tool?.inputSchema && Array.isArray(tool.inputSchema.properties) && tool.inputSchema.properties.length === 0) {
          tool.inputSchema.properties = {};
        }
      }
    }
    const parsed = ListToolsResultSchema.safeParse(result);
    if (!parsed.success) throw new Error("Inspector API returned an invalid tools list.");
    return parsed.data;
  });

  server.setRequestHandler(CallToolRequestSchema, (request, extra) =>
    callTool(api, request.params.name, request.params.arguments ?? {}, extra.signal));

  server.setRequestHandler(ListPromptsRequestSchema, async (request, extra) => {
    const result = await api.call(query("/prompts", { cursor: request.params?.cursor }), undefined, extra.signal);
    const parsed = ListPromptsResultSchema.safeParse(result);
    if (!parsed.success) throw new Error("Inspector API returned an invalid prompts list.");
    return parsed.data;
  });

  server.setRequestHandler(GetPromptRequestSchema, async (request, extra) => {
    const params: Record<string, string> = { name: request.params.name };
    for (const [name, value] of Object.entries(request.params.arguments ?? {})) params[`arguments[${name}]`] = value;
    const result = await api.call(query("/prompts/get", params), undefined, extra.signal);
    const parsed = GetPromptResultSchema.safeParse(result);
    if (!parsed.success) throw new Error("Inspector API returned an invalid prompt.");
    return parsed.data;
  });

  server.setRequestHandler(ListResourcesRequestSchema, async (request, extra) => {
    const result = await api.call(query("/resources", { cursor: request.params?.cursor }), undefined, extra.signal);
    const parsed = ListResourcesResultSchema.safeParse(result);
    if (!parsed.success) throw new Error("Inspector API returned an invalid resources list.");
    return parsed.data;
  });

  server.setRequestHandler(ReadResourceRequestSchema, async (request, extra) => {
    const result = await api.call(query("/resources/read", { uri: request.params.uri }), undefined, extra.signal);
    const parsed = ReadResourceResultSchema.safeParse(result);
    if (!parsed.success) throw new Error("Inspector API returned an invalid resource.");
    return parsed.data;
  });

  return server;
}
