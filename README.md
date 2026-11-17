# @gridinsoft/mcp-inspector

A [Model Context Protocol](https://modelcontextprotocol.io/) server for domain reputation and URL analysis, powered by [GridinSoft Inspector](https://inspector.gridinsoft.com).

## Remote MCP with browser sign-in

Add a remote server in a client that supports **Streamable HTTP and OAuth**, using:

```text
https://inspector.gridinsoft.com/mcp/server
```

Choose Connect/Authenticate, sign in or create a Free Inspector account, confirm your email if needed, and review the permission screen. No Node.js installation or copied API key is needed. The connection can check domains (3 credits), scan URLs (10 credits), and read your balance (free). New Free accounts include 100 credits per month. Never paste secrets into chat.

Verify the connection once with `get_balance`, then ask a concrete website-trust question. Manage or revoke access in [Connected AI assistants](https://inspector.gridinsoft.com/mcp/connections). Reconnect when your client asks you to sign in again.

Try asking: “Can I trust this shop?”, “Check this login link for phishing”, or “Review this download source.” For client compatibility and custom integrations, see the [technical reference](https://github.com/gridinsoft/mcp-inspector/blob/main/docs/integration.md).

## Local adapter requirements

- Node.js 22 or newer, with npm/npx available to your MCP host.
- A GridinSoft Inspector API key from your [profile](https://inspector.gridinsoft.com/profile).

Use the local adapter if your client supports command-based MCP servers. Setup recipes for individual clients are available in the [connection guide](https://inspector.gridinsoft.com/mcp#local-adapter).

## Connect the local adapter

Add this entry to your client's MCP server configuration:

```json
{
  "mcpServers": {
    "gridinsoft": {
      "command": "npx",
      "args": ["-y", "@gridinsoft/mcp-inspector@1.1.1"],
      "env": {
        "GRIDINSOFT_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

Use the version shown in this configuration and restart your MCP client after updating it.

The adapter verifies your API key on connection. This check uses zero credits.

Use the configuration location and command transport supported by your MCP host. If it cannot find `npx`, supply the absolute path to your Node.js installation's `npx` executable.

URL scans may take up to 90 seconds. Where your client supports it, set its tool timeout to at least **120 seconds**. After a timeout, check the Inspector dashboard before submitting the scan again; the first request may have already consumed credits.

## Tools

| Tool | Input | Purpose | Credits |
| --- | --- | --- | --- |
| `inspect_domain` | `{"domain":"example.com"}` | Available reputation score, verdict, categories, and report link | 3 |
| `scan_url` | `{"url":"https://example.com/login"}` | Page metadata and available security signals; additional analysis depends on the plan | 10 |
| `get_balance` | `{}` | Remaining credits and subscription status | Free |

An `Unknown` verdict means no assessment is available; it does not mean the target is safe. The local adapter also supports `check_domain_safety` and `get_domain_reputation` as aliases for `inspect_domain`. Use only one domain tool per assessment; each call costs 3 credits.

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
npx -y @gridinsoft/mcp-inspector@1.1.1 --check
npx -y @gridinsoft/mcp-inspector@1.1.1 check example.com
npx -y @gridinsoft/mcp-inspector@1.1.1 inspect example.com
npx -y @gridinsoft/mcp-inspector@1.1.1 scan https://example.com/login
npx -y @gridinsoft/mcp-inspector@1.1.1 --help
```

`--check` verifies the connection without spending credits. Tool commands print JSON and exit with a nonzero status on failure.

Running without arguments starts the MCP server for your client.

## Troubleshooting

- **`GRIDINSOFT_API_KEY is not set`:** add the key to the MCP server configuration; GUI clients may not inherit variables exported in a terminal.
- **HTTP 401:** replace the placeholder or revoked key with your current [profile key](https://inspector.gridinsoft.com/profile), then restart the client.
- **An older version starts:** use the complete pinned package name above. Verify with `npx -y @gridinsoft/mcp-inspector@1.1.1 --version`.
- **Connection or scan timeout:** verify the network and client timeout settings. Do not automatically repeat a paid scan.

## Plans

New accounts receive 100 free API credits per month. See the [Inspector dashboard](https://inspector.gridinsoft.com/profile) for current plans and pricing.

## Developer documentation

- [Integration reference](https://github.com/gridinsoft/mcp-inspector/blob/main/docs/integration.md)
- [Development and testing](https://github.com/gridinsoft/mcp-inspector/blob/main/CONTRIBUTING.md)

## License

MIT
