# ikas-docs-scraper-mcp

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/atapinar/ikas-api-docs-mcp/releases/tag/v1.0.0)
[![MCP](https://img.shields.io/badge/MCP-Compatible-green.svg)](https://modelcontextprotocol.io)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)

MCP server for scraping and serving ikas.dev documentation to LLMs. Provides instant access to ikas API documentation, GraphQL schemas, and code examples through the Model Context Protocol.

## Installation

```bash
# Clone the repository
git clone https://github.com/atapinar/ikas-api-docs-mcp.git
cd ikas-api-docs-mcp

# Install dependencies
npm install

# Build the project
npm run build

# Run initial crawl (optional but recommended)
node build/demo-workflow.js
```

## Phase 1 Complete ✓

Successfully implemented:
- ✓ Project setup with TypeScript and all dependencies
- ✓ Basic scraper that fetches pages (supports both static and JS-rendered content)
- ✓ File-based cache system with full CRUD operations
- ✓ Minimal MCP server with basic tools

## Phase 2 Complete ✓

Enhanced extraction and MCP tools:
- ✓ Smart content extraction with structured data
- ✓ GraphQL schema parsing and analysis
- ✓ Code example extraction
- ✓ API endpoint discovery
- ✓ 11 specialized MCP tools

## Phase 3 Complete ✓

Search & Discovery:
- ✓ Smart crawler that discovers documentation pages automatically
- ✓ Full-text search index with keyword extraction
- ✓ GraphQL type indexing for fast lookups
- ✓ Advanced search with category and type filtering
- ✓ Automatic index rebuilding after crawls
- ✓ 14 total MCP tools including:
  - `crawl_site`: Discover and cache documentation pages
  - `rebuild_index`: Rebuild search index from cache
  - `search_advanced`: Advanced search with filters

## Quick Start

### With Claude Desktop

1. Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "ikas-docs-scraper": {
      "command": "node",
      "args": ["/path/to/ikas-docs-scraper-mcp/build/index.js"],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

2. Restart Claude Desktop

3. Use the tools in your conversations!

### With MCP Inspector

```bash
# Test locally
npm run mcp:test

# Or with custom ports
npm run mcp:test:alt
```

## Test the MCP Server

1. Using MCP Inspector:
```bash
npx @modelcontextprotocol/inspector node build/index.js
```

2. Configure Claude Desktop:
Copy the contents of `claude_desktop_config.json` to your Claude Desktop configuration.

## Available Tools

### Basic Tools
- **get_page**: Fetches any ikas documentation page or playground with enhanced extraction
- **search_docs**: Fast indexed search through all cached pages
- **search_advanced**: Search with category/type filters
- **cache_stats**: Shows cache statistics and cached URLs

### GraphQL Tools
- **find_graphql_type**: Finds type definitions (Product, Order, etc.)
- **find_mutation**: Finds mutations (create product, update order, etc.)
- **find_query**: Find queries for data fetching
- **find_code_example**: Finds code examples by topic and language

### Discovery Tools
- **crawl_site**: Automatically discover and cache documentation pages
- **rebuild_index**: Rebuild the search index
- **list_categories**: Lists all documentation categories

### Coming Soon
- **get_field_info**: Get detailed field information
- **get_api_endpoint**: Get API endpoint info
- **explain_error**: Explain errors with solutions

## Usage Examples

### First Time Setup

1. **Crawl the documentation** (builds your local cache):
```json
crawl_site { "maxPages": 50 }
```

2. **Search for specific topics**:
```json
search_docs { "query": "product variants" }
```

3. **Find GraphQL types**:
```json
find_graphql_type { "typeName": "Product" }
```

4. **Find mutations**:
```json
find_mutation { "action": "create", "entity": "product" }
```

5. **Get specific documentation**:
```json
get_page { "url": "https://ikas.dev/docs/api/admin-api/products" }
```

## Development

```bash
# Run in development mode
npm run dev

# Run tests
npm test

# Type checking
npm run typecheck

# Lint
npm run lint
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT

## Acknowledgments

- Built with [Model Context Protocol](https://modelcontextprotocol.io)
- Powered by [Puppeteer](https://pptr.dev/) and [Cheerio](https://cheerio.js.org/)
- Created for the [ikas](https://ikas.dev) developer community