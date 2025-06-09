# How to Build an MCP (Model Context Protocol) Server

## What is MCP and its architecture

The Model Context Protocol (MCP) is an **open standard** developed by Anthropic in November 2024 that enables seamless integration between Large Language Model applications and external data sources. Often described as "USB-C for AI applications," MCP solves the M×N integration problem by providing a standardized communication layer between AI models and tools.

MCP follows a **client-server architecture** with three core components:
- **MCP Host**: The application users interact with (Claude Desktop, Cursor, Zed)
- **MCP Client**: Lives within the host, manages 1:1 connections with servers
- **MCP Server**: External programs exposing capabilities through tools, resources, and prompts

The protocol is built on JSON-RPC 2.0 and supports multiple transport mechanisms including stdio (local processes), HTTP with Server-Sent Events, and the new Streamable HTTP transport. Communication follows a structured lifecycle: initialization handshake, operation phase for message exchange, and graceful shutdown.

## Step-by-step guide to create an MCP server from scratch

Creating an MCP server involves several key steps. Here's a complete walkthrough for both Python and TypeScript implementations.

### Python Implementation

**Step 1: Environment Setup**
```bash
# Create project directory
mkdir my-mcp-server && cd my-mcp-server

# Set up virtual environment with uv (recommended)
pip install uv
uv init
uv venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install MCP SDK
uv add "mcp[cli]"
```

**Step 2: Create Basic Server**
```python
from mcp.server.fastmcp import FastMCP
import asyncio

# Initialize FastMCP server
mcp = FastMCP("My First MCP Server")

# Define a simple tool
@mcp.tool()
def add_numbers(a: int, b: int) -> int:
    """Add two numbers together"""
    return a + b

# Define a resource
@mcp.resource("greeting")
def get_greeting(name: str = "World") -> str:
    """Get a personalized greeting"""
    return f"Hello, {name}!"

# Define a prompt
@mcp.prompt()
def math_helper() -> str:
    """Prompt for helping with math problems"""
    return "I can help you with mathematical calculations. What would you like to compute?"

if __name__ == "__main__":
    mcp.run()
```

### TypeScript Implementation

**Step 1: Project Setup**
```bash
mkdir my-mcp-server-ts && cd my-mcp-server-ts
npm init -y
npm install @modelcontextprotocol/sdk zod
npm install --save-dev typescript @types/node
```

**Step 2: Configure TypeScript**
```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "outDir": "./build",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true
  }
}
```

**Step 3: Create Server**
```typescript
// src/index.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({
  name: "My TypeScript MCP Server",
  version: "1.0.0"
});

// Add a tool
server.tool("calculate", {
  operation: z.enum(["add", "subtract", "multiply", "divide"]),
  a: z.number(),
  b: z.number()
}, async ({ operation, a, b }) => {
  let result: number;
  switch (operation) {
    case "add": result = a + b; break;
    case "subtract": result = a - b; break;
    case "multiply": result = a * b; break;
    case "divide": result = a / b; break;
  }
  return {
    content: [{
      type: "text",
      text: `${a} ${operation} ${b} = ${result}`
    }]
  };
});

// Start server
const transport = new StdioServerTransport();
await server.connect(transport);
```

## Required dependencies and setup process

### Core Dependencies by Language

**Python Stack (3.10+ required):**
- `mcp>=1.9.3` - Main SDK
- `pydantic>=2.0.0` - Data validation
- `asyncio-compat>=0.3.0` - Async compatibility
- `httpx` - For HTTP clients (optional)
- `uv` - Recommended package manager

**TypeScript/JavaScript Stack (Node.js 18+ required):**
- `@modelcontextprotocol/sdk^1.12.1` - Main SDK
- `zod^3.22.0` - Schema validation
- `typescript^5.3.3` - Type safety
- `@types/node^20.11.24` - Node.js types

### Project Structure

**Python Project:**
```
my-mcp-server/
├── src/
│   ├── my_mcp_server/
│   │   ├── __init__.py
│   │   ├── server.py        # Main server
│   │   ├── tools/           # Tool implementations
│   │   ├── resources/       # Resource implementations
│   │   └── utils/           # Utilities
├── tests/
├── pyproject.toml
├── requirements.txt
└── README.md
```

**TypeScript Project:**
```
my-mcp-server/
├── src/
│   ├── index.ts            # Main server entry
│   ├── tools/              # Tool implementations
│   ├── resources/          # Resource implementations
│   ├── types/              # Type definitions
│   └── utils/              # Utility functions
├── build/                  # Compiled output
├── package.json
├── tsconfig.json
└── README.md
```

## How to define and implement tools in an MCP server

Tools in MCP follow a specific JSON Schema format for parameter definition. Here's how to implement them effectively:

### Python Tool Implementation

```python
from mcp.server.fastmcp import FastMCP
from typing import List, Dict, Any
import httpx

mcp = FastMCP("Tool Server")

# Simple synchronous tool
@mcp.tool()
def calculate_bmi(weight_kg: float, height_m: float) -> float:
    """Calculate BMI given weight in kg and height in meters"""
    return weight_kg / (height_m ** 2)

# Async tool with external API
@mcp.tool()
async def fetch_weather(city: str) -> str:
    """Fetch current weather for a city"""
    async with httpx.AsyncClient() as client:
        response = await client.get(f"https://api.weather.com/{city}")
        return response.text

# Tool with complex parameters
@mcp.tool()
def analyze_data(
    data: list[dict], 
    operations: list[str], 
    threshold: float = 0.5
) -> dict:
    """Analyze data with specified operations"""
    results = {}
    for operation in operations:
        if operation == "average":
            values = [item.get("value", 0) for item in data]
            results[operation] = sum(values) / len(values) if values else 0
        elif operation == "count":
            results[operation] = len([item for item in data if item.get("value", 0) > threshold])
    return results
```

### TypeScript Tool Implementation

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

// Tool with validation
server.tool(
  "process-data",
  {
    data: z.array(z.object({
      id: z.string(),
      value: z.number(),
      category: z.enum(["A", "B", "C"])
    })),
    operation: z.enum(["sum", "average", "count"]),
    filter: z.object({
      category: z.string().optional(),
      minValue: z.number().optional()
    }).optional()
  },
  async ({ data, operation, filter }) => {
    let filteredData = data;
    
    if (filter) {
      filteredData = data.filter(item => {
        if (filter.category && item.category !== filter.category) return false;
        if (filter.minValue && item.value < filter.minValue) return false;
        return true;
      });
    }
    
    let result;
    switch (operation) {
      case "sum":
        result = filteredData.reduce((sum, item) => sum + item.value, 0);
        break;
      case "average":
        result = filteredData.reduce((sum, item) => sum + item.value, 0) / filteredData.length;
        break;
      case "count":
        result = filteredData.length;
        break;
    }
    
    return {
      content: [{
        type: "text",
        text: `${operation.toUpperCase()}: ${result}`
      }]
    };
  }
);
```

### Tool Implementation Best Practices

**Input Validation and Sanitization:**
```python
import re
from pathlib import Path

def validate_and_sanitize_input(
    value: Union[str, int, float], 
    input_type: str, 
    max_length: int = None
) -> Union[str, int, float]:
    """Comprehensive input validation"""
    
    if input_type == "string":
        if not isinstance(value, str):
            raise ValueError("Expected string input")
        
        # Remove potentially dangerous characters
        sanitized = re.sub(r'[<>"\';&]', '', value)
        
        if max_length and len(sanitized) > max_length:
            raise ValueError(f"Input too long (max {max_length})")
            
        return sanitized
    
    elif input_type == "path":
        # Validate file paths
        try:
            path = Path(value).resolve()
            # Ensure path is within allowed directories
            allowed_bases = [Path("/tmp"), Path("/home/user/data")]
            if not any(str(path).startswith(str(base)) for base in allowed_bases):
                raise ValueError("Path not in allowed directory")
            return str(path)
        except Exception:
            raise ValueError("Invalid file path")
    
    return value
```

## Best practices for MCP server development

### Security Best Practices

**Never expose sensitive data:**
```python
import os
from functools import wraps

def require_auth(scopes: List[str] = None):
    """Decorator for tool authentication"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            ctx = kwargs.get('ctx')
            if not ctx or not validate_auth(ctx, scopes):
                raise PermissionError("Insufficient permissions")
            return await func(*args, **kwargs)
        return wrapper
    return decorator

@mcp.tool()
@require_auth(scopes=["read:data"])
async def get_sensitive_data(query: str, ctx: Context) -> str:
    """Access sensitive data with authentication"""
    user_id = ctx.request_context.user_id
    audit_log(f"User {user_id} accessed sensitive data with query: {query}")
    
    # Process request with user context
    return await fetch_user_data(user_id, query)
```

### Performance Optimization

**Implement caching for expensive operations:**
```python
from functools import lru_cache
import asyncio
from typing import Dict, Any
import time

class AsyncLRUCache:
    """Async LRU cache with TTL"""
    def __init__(self, maxsize: int = 128, ttl: int = 300):
        self.cache: Dict[str, tuple] = {}
        self.maxsize = maxsize
        self.ttl = ttl
    
    async def get(self, key: str, fetch_func):
        now = time.time()
        
        if key in self.cache:
            value, timestamp = self.cache[key]
            if now - timestamp < self.ttl:
                return value
            del self.cache[key]
        
        # Fetch new value
        value = await fetch_func()
        
        # Maintain cache size
        if len(self.cache) >= self.maxsize:
            oldest_key = min(self.cache.keys(), 
                           key=lambda k: self.cache[k][1])
            del self.cache[oldest_key]
        
        self.cache[key] = (value, now)
        return value

cache = AsyncLRUCache(maxsize=100, ttl=300)

@mcp.tool()
async def cached_api_call(endpoint: str) -> dict:
    """API call with caching"""
    
    async def fetch():
        async with httpx.AsyncClient() as client:
            response = await client.get(endpoint)
            return response.json()
    
    return await cache.get(endpoint, fetch)
```

### Code Organization

**Modular tool organization:**
```python
# tools/database.py
from mcp.server.fastmcp import FastMCP
from typing import List, Dict, Any

def register_database_tools(mcp: FastMCP):
    @mcp.tool()
    async def query_table(table: str, conditions: Dict[str, Any]) -> List[Dict]:
        """Query database table"""
        # Implementation
        pass
    
    @mcp.tool()
    async def insert_record(table: str, data: Dict[str, Any]) -> str:
        """Insert record into table"""
        # Implementation
        pass

# main.py
from mcp.server.fastmcp import FastMCP
from tools.database import register_database_tools
from tools.file_operations import register_file_tools

mcp = FastMCP("Modular Server")

# Register tool modules
register_database_tools(mcp)
register_file_tools(mcp)

if __name__ == "__main__":
    mcp.run()
```

## How to test and debug MCP servers

### Testing with MCP Inspector

The MCP Inspector is the primary tool for testing servers during development:

```bash
# Basic server testing
npx @modelcontextprotocol/inspector node build/index.js

# Python server testing
mcp dev server.py

# Test with custom ports
CLIENT_PORT=8080 SERVER_PORT=9000 npx @modelcontextprotocol/inspector node build/index.js

# Test specific tool
npx @modelcontextprotocol/inspector --cli node build/index.js \
  --method tools/call --tool-name mytool --tool-arg key=value
```

### Unit Testing

**Python testing with pytest:**
```python
import pytest
from unittest.mock import Mock, patch
from your_mcp_server import McpServer

class TestMcpServer:
    def test_tool_execution(self):
        # Test individual tool logic without external dependencies
        server = McpServer()
        result = server.execute_tool("test_tool", {"param": "value"})
        assert result["status"] == "success"
    
    @patch("your_mcp_server.external_api_call")
    def test_external_api_integration(self, mock_api):
        # Mock external dependencies
        mock_api.return_value = {"data": "test"}
        server = McpServer()
        result = server.fetch_data("test_query")
        assert result["data"] == "test"
```

**TypeScript testing with Jest:**
```typescript
import { McpServer } from './mcp-server';
import { jest } from '@jest/globals';

describe('MCP Server Tests', () => {
  test('tool execution with valid input', async () => {
    const server = new McpServer();
    const result = await server.executeTool('test_tool', { param: 'value' });
    expect(result.status).toBe('success');
  });

  test('error handling for invalid input', async () => {
    const server = new McpServer();
    await expect(server.executeTool('invalid_tool', {}))
      .rejects.toThrow('Tool not found');
  });
});
```

### Debugging Techniques

**Proper logging setup:**
```python
import logging
import sys

# Configure logging to stderr (important for stdio transport)
logging.basicConfig(
    stream=sys.stderr,
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# Never log to stdout in stdio transport!
print("Debug message", file=sys.stderr)  # Correct
# print("Debug message")  # Wrong - interferes with JSON-RPC
```

**Performance monitoring:**
```python
import time
import logging

def timed_tool(func):
    """Decorator to measure tool execution time"""
    def wrapper(*args, **kwargs):
        start = time.time()
        try:
            result = func(*args, **kwargs)
            duration = time.time() - start
            logging.info(f"{func.__name__} took {duration:.2f}s")
            return result
        except Exception as e:
            duration = time.time() - start
            logging.error(f"{func.__name__} failed after {duration:.2f}s: {e}")
            raise
    return wrapper
```

## How to connect MCP servers to Claude or other AI assistants

### Claude Desktop Integration

**Configuration file locations:**
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%/Claude/claude_desktop_config.json`

**Basic configuration:**
```json
{
  "mcpServers": {
    "my-server": {
      "command": "node",
      "args": ["/absolute/path/to/build/index.js"],
      "env": {
        "API_KEY": "your-api-key",
        "DEBUG": "false"
      }
    }
  }
}
```

**Python server with virtual environment:**
```json
{
  "mcpServers": {
    "python-server": {
      "command": "/path/to/venv/bin/python",
      "args": ["-m", "my_mcp_server"],
      "env": {
        "PYTHONPATH": "/path/to/project",
        "API_KEY": "${API_KEY}"
      }
    }
  }
}
```

**NPX package server:**
```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/Users/username/Documents"],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

### Authentication Setup

**OAuth 2.1 implementation for remote servers:**
```json
// .well-known/oauth-authorization-server
{
  "issuer": "https://your-mcp-server.com",
  "authorization_endpoint": "https://your-mcp-server.com/oauth/authorize",
  "token_endpoint": "https://your-mcp-server.com/oauth/token",
  "jwks_uri": "https://your-mcp-server.com/.well-known/jwks.json",
  "scopes_supported": ["read", "write", "admin"],
  "response_types_supported": ["code"],
  "grant_types_supported": ["authorization_code", "refresh_token"],
  "code_challenge_methods_supported": ["S256"]
}
```

### VS Code Integration

```json
// .vscode/mcp.json
{
  "mcpServers": {
    "project-server": {
      "command": "node",
      "args": ["./mcp-server/build/index.js"],
      "env": {
        "PROJECT_ROOT": "${workspaceFolder}"
      }
    }
  }
}
```

## Example code and project structure

### Complete Weather Server Example

```python
from typing import Any
import httpx
from mcp.server.fastmcp import FastMCP

# Initialize FastMCP server
mcp = FastMCP("weather")

# Constants
NWS_API_BASE = "https://api.weather.gov"
USER_AGENT = "weather-app/1.0"

@mcp.tool()
async def get_forecast(city: str) -> str:
    """Get weather forecast for a city"""
    try:
        # Get coordinates for the city
        geocode_url = f"{NWS_API_BASE}/geocode/{city}"
        async with httpx.AsyncClient() as client:
            response = await client.get(geocode_url, headers={"User-Agent": USER_AGENT})
            data = response.json()
            
        # Get forecast from coordinates
        forecast_url = data["properties"]["forecast"]
        async with httpx.AsyncClient() as client:
            response = await client.get(forecast_url, headers={"User-Agent": USER_AGENT})
            forecast_data = response.json()
            
        periods = forecast_data["properties"]["periods"][:3]
        forecast = "\n".join([
            f"{period['name']}: {period['detailedForecast']}"
            for period in periods
        ])
        
        return forecast
    except Exception as e:
        return f"Error getting forecast: {str(e)}"

@mcp.resource("weather://alerts/{state}")
def get_alerts(state: str) -> str:
    """Get weather alerts for a state"""
    # Implementation for weather alerts
    pass

if __name__ == "__main__":
    mcp.run()
```

### File System Server (TypeScript)

```typescript
import { FastMCP } from "fastmcp";
import { z } from "zod";
import * as fs from 'fs/promises';
import * as path from 'path';

const server = new FastMCP({
  name: "filesystem-server",
  version: "1.0.0",
});

server.addTool({
  name: "read_file",
  description: "Read contents of a file",
  parameters: z.object({
    path: z.string().describe("File path to read"),
  }),
  execute: async (args) => {
    try {
      const content = await fs.readFile(args.path, 'utf-8');
      return { type: "text", text: content };
    } catch (error) {
      throw new Error(`Failed to read file: ${error.message}`);
    }
  },
});

server.addTool({
  name: "write_file",
  description: "Write content to a file",
  parameters: z.object({
    path: z.string().describe("File path to write"),
    content: z.string().describe("Content to write"),
  }),
  execute: async (args) => {
    try {
      await fs.writeFile(args.path, args.content, 'utf-8');
      return { type: "text", text: "File written successfully" };
    } catch (error) {
      throw new Error(`Failed to write file: ${error.message}`);
    }
  },
});

server.addResource({
  uri: "file:///project/structure",
  name: "Project Structure",
  mimeType: "text/plain",
  async load() {
    // Return directory structure
    return { text: await getDirectoryStructure(".") };
  },
});
```

## Common pitfalls and troubleshooting tips

### Protocol Implementation Issues

**Incorrect JSON-RPC format:**
```python
# WRONG - Invalid JSON-RPC response
def bad_response():
    return "Just a string"  # Missing required JSON-RPC structure

# CORRECT - Proper JSON-RPC response
def good_response():
    return {
        "jsonrpc": "2.0",
        "id": request_id,
        "result": {
            "content": [{"type": "text", "text": "Response content"}]
        }
    }
```

**Logging to stdout instead of stderr:**
```python
# WRONG - Interferes with MCP protocol
print("Debug message")  # Goes to stdout

# CORRECT - Use stderr for logging
import sys
print("Debug message", file=sys.stderr)
```

### Security Vulnerabilities to Avoid

**Command injection:**
```python
# WRONG - Vulnerable to command injection
import subprocess
def execute_command(user_input: str):
    result = subprocess.run(f"ls {user_input}", shell=True, capture_output=True)
    return result.stdout.decode()

# CORRECT - Safe parameter passing
def execute_command(directory: str):
    # Validate input
    if not directory.replace('/', '').replace('.', '').replace('_', '').replace('-', '').isalnum():
        raise ValueError("Invalid directory name")
    
    result = subprocess.run(['ls', directory], capture_output=True, text=True)
    return result.stdout
```

**Path traversal:**
```python
# WRONG - Vulnerable to path traversal
def read_file(filename: str):
    with open(f"/safe/directory/{filename}", 'r') as f:
        return f.read()

# CORRECT - Path validation
import os
def read_file(filename: str):
    # Normalize and validate path
    safe_dir = "/safe/directory"
    full_path = os.path.normpath(os.path.join(safe_dir, filename))
    
    if not full_path.startswith(safe_dir):
        raise ValueError("Invalid file path")
    
    with open(full_path, 'r') as f:
        return f.read()
```

### Troubleshooting Connection Issues

**Server not starting:**
```bash
# Check if server runs independently
python -m my_mcp_server

# Verify dependencies are installed
pip list | grep mcp

# Check for syntax errors
python -m py_compile my_server.py

# Enable detailed logging
PYTHONPATH=. python -m my_mcp_server --verbose
```

**Protocol version mismatch:**
```python
# Ensure correct protocol version in server
server = FastMCP(
    name="my-server",
    version="1.0.0"
)
# Protocol version should match client expectations (2024-11-05 or later)
```

### Performance Optimization

**Memory leak prevention:**
```python
import gc
import weakref
from typing import Dict, Any

class ResourceManager:
    def __init__(self):
        self._resources: Dict[str, Any] = {}
        self._callbacks = weakref.WeakSet()
    
    def register_resource(self, name: str, resource: Any):
        # Clean up old resource if exists
        if name in self._resources:
            self.cleanup_resource(name)
        
        self._resources[name] = resource
    
    def cleanup_resource(self, name: str):
        resource = self._resources.pop(name, None)
        if hasattr(resource, 'close'):
            resource.close()
    
    def periodic_cleanup(self):
        """Call this periodically to force cleanup"""
        gc.collect()
        # Remove any dead references
        self._resources = {k: v for k, v in self._resources.items() 
                          if v is not None}
```

## Deployment Options

### Docker Deployment

```dockerfile
FROM node:20-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["node", "build/index.js"]
```

### Cloud Deployment (Cloudflare Workers)

```typescript
// Deploy remote MCP server
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.url.endsWith('/sse')) {
      return handleMcpSse(request, env);
    }
    
    if (request.url.includes('/.well-known/oauth-authorization-server')) {
      return new Response(JSON.stringify(authServerMetadata));
    }
    
    return new Response('MCP Server', { status: 200 });
  }
};
```

## Summary

Building an MCP server requires understanding the protocol's architecture, implementing tools and resources with proper validation, following security best practices, and configuring the server correctly for integration with AI assistants. The ecosystem provides robust SDKs for both Python and TypeScript, with tools like the MCP Inspector making development and debugging straightforward. By following the patterns and practices outlined in this guide, you can create secure, performant MCP servers that effectively bridge AI models with external capabilities.