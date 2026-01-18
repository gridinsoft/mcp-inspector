# @gridinsoft/mcp-inspector

MCP (Model Context Protocol) server for domain and URL security analysis powered by [GridinSoft Inspector](https://inspector.gridinsoft.com).

## Features

- **Domain Analysis** - Check domain reputation, category, and threat level
- **URL Scanning** - Detect phishing, malware, and malicious redirects
- **Real-time Data** - Access GridinSoft's constantly updated threat database

## Installation

### Claude Desktop

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

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

### Cursor IDE

1. Go to **Settings** -> **Models** -> **MCP**
2. Click **+ Add new MCP server**
3. Set Name to `GridinSoft`, Type to `command`, and Command to `npx -y @gridinsoft/mcp-inspector`
4. Add Environment Variable `GRIDINSOFT_API_KEY` with your key.

### Windsurf IDE

Add to your Windsurf config (`~/.codeium/windsurf/mcp_config.json`):

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

### Get API Key

1. Sign up at [inspector.gridinsoft.com](https://inspector.gridinsoft.com/login)
2. Get your API key from [Profile page](https://inspector.gridinsoft.com/profile)
3. New accounts receive **100 free credits**

## Available Tools

### inspect_domain

Analyze a domain for security threats and reputation.

```
"Analyze the domain suspicious-site.com for security threats"
```

**Cost**: 1 credit

### scan_url

Scan a complete URL for phishing, malware, and redirects.

```
"Scan https://example.com/login.php for threats"
```

**Cost**: 3 credits

### get_balance

Check your remaining credits and subscription status.

```
"How many API credits do I have left?"
```

**Cost**: Free

## Pricing

| Plan         | Credits | Price (Annually) |
| ------------ | ------- | ---------------- |
| **Free**     | 100     | $0               |
| **Basic**    | 1,500   | $44/mo           |
| **Standard** | 5,000   | $124/mo          |
| **Premium**  | 20,000  | $539/mo          |

## Links

- [Documentation](https://inspector.gridinsoft.com/mcp)
- [Support](mailto:support@gridinsoft.com)

## License

MIT
