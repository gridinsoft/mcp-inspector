# Integration reference

For account setup, client recipes, and pricing, start with the [connection guide](https://inspector.gridinsoft.com/mcp).

## Remote MCP

Use `https://inspector.gridinsoft.com/mcp/server` with Streamable HTTP and OAuth. The client must support OAuth discovery, dynamic registration of public clients, S256 PKCE, and resource indicators. Legacy SSE transport and client-ID metadata documents are not supported. Use the local adapter if your client cannot use this authorization flow.

Connections last up to 30 days before sign-in is required again. Compatible clients refresh access automatically. Users can revoke a connection in [Connected AI assistants](https://inspector.gridinsoft.com/mcp/connections).

The remote service exposes `inspect_domain`, `scan_url`, and `get_balance`, plus the prompts and category resource documented in the [README](../README.md#prompts-and-resources).

## Local adapter

The npm package uses stdio for MCP and calls the Inspector REST API over HTTPS. The documentation page at `/mcp` and the REST base path at `/mcp/v1` are not remote MCP endpoints. Use `/mcp/server` for remote MCP.

The local adapter additionally exposes `check_domain_safety` and `get_domain_reputation` as aliases for `inspect_domain`. They return the same assessment and each call costs 3 credits; calling multiple aliases does not add evidence.

Configure `GRIDINSOFT_API_KEY` in the client's environment. Before opening an MCP connection, the adapter validates the key without consuming credits. A missing or rejected key fails startup and writes an explanation to stderr.

Pin the package version in your client configuration. An unversioned `npx` command can select an older package installed in the current directory or an ancestor. If the host cannot find `npx`, configure its absolute executable path.

## Timeouts and errors

URL scans can take up to 90 seconds. Set the client tool timeout to at least 120 seconds where supported. The local adapter's HTTP timeout defaults to 110 seconds; `GRIDINSOFT_TIMEOUT_MS` overrides it with a positive integer in milliseconds.

The adapter does not automatically retry requests. A timed-out scan may have already consumed credits, so check the Inspector dashboard before submitting it again.

Tool execution errors return `isError: true` with an explanation in `content`. Discovery and prompt/resource failures surface as MCP errors. An `Unknown` assessment is a valid result indicating missing evidence, not a safe verdict.

## REST integrations

Custom REST clients can use the [endpoint and response reference](https://inspector.gridinsoft.com/mcp#mcp-reference-title). These routes use ordinary JSON requests; they do not implement the MCP transport. Keep credentials in local configuration or a secret store, never in prompts or source control.
