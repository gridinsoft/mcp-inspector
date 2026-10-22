# @gridinsoft/mcp-inspector

A [Model Context Protocol](https://modelcontextprotocol.io/) server for domain reputation and URL analysis, powered by [GridinSoft Inspector](https://inspector.gridinsoft.com).

## Requirements

- Node.js 22 or newer, with npm/npx available to your MCP host.
- A GridinSoft Inspector API key from your [profile](https://inspector.gridinsoft.com/profile).

The npm package runs locally over **stdio** and calls the Inspector REST API over HTTPS. `https://inspector.gridinsoft.com/mcp` is the documentation page; `/mcp/v1` is the REST bridge used by this package. Neither URL is a native remote MCP Streamable HTTP or SSE endpoint.

## Connect an MCP client

Add this entry to your client's MCP server configuration:

```json
{
  "mcpServers": {
    "gridinsoft": {
      "command": "npx",
      "args": ["-y", "@gridinsoft/mcp-inspector"],
      "env": {
        "GRIDINSOFT_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

Use the configuration location and command transport supported by your MCP host. If it cannot find `npx`, supply the absolute path to your Node.js installation's `npx` executable.

URL scans may take up to 90 seconds. Where your client supports it, set its MCP request timeout to at least **120 seconds**. The adapter's HTTP timeout defaults to 110 seconds and can be configured with `GRIDINSOFT_TIMEOUT_MS` (a positive integer in milliseconds). The adapter does not automatically retry requests, because a submitted scan may have already consumed credits. After a timeout, check the Inspector dashboard before submitting it again.

## Tools

| Tool | Input | Purpose | Credits |
| --- | --- | --- | --- |
| `inspect_domain` | `{"domain":"example.com"}` | Available reputation score, verdict, categories, and report link | 3 |
| `check_domain_safety` | `{"domain":"example.com"}` | Alias for `inspect_domain` | 3 |
| `get_domain_reputation` | `{"domain":"example.com"}` | Alias for `inspect_domain` | 3 |
| `scan_url` | `{"url":"https://example.com/login"}` | Page metadata and available security signals; additional analysis depends on the plan | 10 |
| `get_balance` | `{}` | Remaining credits and subscription status | Free |

An `Unknown` verdict means no assessment is available; it does not mean the target is safe. Tool execution errors return `isError: true`, with an explanation in `content`. Discovery or prompt/resource failures surface as MCP errors.

## Prompts and resources

- `check-website-safety` requires the `site` argument (a URL or domain).
- `verify-domain-trust` requires the `domain` argument.
- `gs://guide/threat-categories` describes the security and content categories. A content category alone does not establish malware or fraud.

Example prompt arguments:

```json
{
  "name": "check-website-safety",
  "arguments": { "site": "https://example.com" }
}
```

## Command-line use

With `GRIDINSOFT_API_KEY` set in your environment:

```sh
npx -y @gridinsoft/mcp-inspector check example.com
npx -y @gridinsoft/mcp-inspector inspect example.com
npx -y @gridinsoft/mcp-inspector scan https://example.com/login
npx -y @gridinsoft/mcp-inspector --help
```

Commands print the JSON tool result and exit with a nonzero status on failure. Running without arguments starts the stdio MCP server when launched by a client.

## Plans

New accounts receive 100 free API credits per month. See the [Inspector dashboard](https://inspector.gridinsoft.com/profile) for current plans and pricing.

## Development

```sh
npm ci
npm test
npm run build
npm pack --dry-run
```

The tests cover MCP initialization, discovery, prompt argument forwarding, resources, tool aliases, authentication errors, HTTP failures, cancellation, timeouts, stdio framing, and CLI exit codes. An additional backend integration fixture can be run against an Inspector checkout with Composer dependencies installed:

```sh
INSPECTOR_TEST_ROOT=/absolute/path/to/inspector node --test test/php-integration.cjs
```

This fixture starts a temporary localhost PHP server, uses the real MCP routes/controller, and makes only public or unauthenticated requests. It does not load the application's environment file or perform paid scans.

## License

MIT
