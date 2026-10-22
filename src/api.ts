const API_BASE = "https://inspector.gridinsoft.com/mcp/v1";
export const DEFAULT_TIMEOUT_MS = 110_000;

export class ApiError extends Error {
  constructor(message: string, readonly responseBody?: unknown) {
    super(message);
    this.name = "ApiError";
  }
}

export interface ApiOptions {
  apiKey: string;
  timeoutMs?: number;
  fetch?: typeof fetch;
}

function errorDetail(body: unknown): string | undefined {
  if (!body || typeof body !== "object") return undefined;
  const value = body as Record<string, unknown>;
  if (typeof value.error === "string") return value.error;
  if (value.error && typeof value.error === "object") {
    const message = (value.error as Record<string, unknown>).message;
    if (typeof message === "string") return message;
  }
  return typeof value.message === "string" ? value.message : undefined;
}

export class InspectorApi {
  readonly apiKey: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;

  constructor(options: ApiOptions) {
    this.apiKey = options.apiKey.trim();
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    if (!Number.isSafeInteger(this.timeoutMs) || this.timeoutMs <= 0 || this.timeoutMs > 2_147_483_647) {
      throw new Error("GRIDINSOFT_TIMEOUT_MS must be a positive integer no greater than 2147483647 milliseconds.");
    }
    this.fetchImpl = options.fetch ?? fetch;
  }

  async call(endpoint: string, body?: object, signal?: AbortSignal): Promise<unknown> {
    const controller = new AbortController();
    const cancel = () => controller.abort(signal?.reason);
    if (signal?.aborted) cancel();
    else signal?.addEventListener("abort", cancel, { once: true });
    const timeout = setTimeout(() => controller.abort(new Error("timeout")), this.timeoutMs);
    try {
      const response = await this.fetchImpl(`${API_BASE}${endpoint}`, {
        method: body === undefined ? "GET" : "POST",
        headers: {
          Accept: "application/json",
          ...(body === undefined ? {} : { "Content-Type": "application/json" }),
          ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
        redirect: "error",
      });
      const text = await response.text();
      let result: unknown;
      try {
        result = JSON.parse(text);
      } catch {
        throw new ApiError(`Inspector API returned non-JSON data (HTTP ${response.status}).`);
      }
      if (!response.ok) {
        let detail = errorDetail(result)?.slice(0, 500);
        if (detail && this.apiKey) detail = detail.replaceAll(this.apiKey, "[redacted]");
        throw new ApiError(`Inspector API error (HTTP ${response.status})${detail ? `: ${detail}` : "."}`, result);
      }
      return result;
    } catch (error) {
      if (signal?.aborted) throw new Error("Inspector API request cancelled.");
      if (controller.signal.aborted) {
        throw new Error(`Inspector API request timed out after ${this.timeoutMs} ms. A submitted scan may still be running; check its status before retrying.`);
      }
      if (error instanceof ApiError) throw error;
      throw new Error("Unable to reach the Inspector API. Check your network connection and try again.");
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener("abort", cancel);
    }
  }
}
