#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ListPromptsRequestSchema,
  ReadResourceRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import path from 'path';
import { fileURLToPath } from 'url';

import { IkasScraper } from './scraper/core.js';
import { FileCache } from './cache/file-cache.js';
import { toolDefinitions } from './mcp/tools.js';
import { ToolHandlers } from './mcp/tool-handlers.js';

// Get the directory of this file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize components
const scraper = new IkasScraper();
// Use absolute path for cache when running from Claude Desktop
const cacheDir = process.env.NODE_ENV === 'production' 
  ? path.join(__dirname, '..', 'cache')
  : './cache';

console.error(`[MCP] Cache directory resolved to: ${cacheDir}`);
console.error(`[MCP] Current directory: ${process.cwd()}`);
console.error(`[MCP] Script directory: ${__dirname}`);

const cache = new FileCache(cacheDir);
const toolHandlers = new ToolHandlers(scraper, cache);

// Create MCP server
const server = new Server(
  {
    name: 'ikas-docs-scraper',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
      prompts: {}
    },
  }
);

// Initialize server components
async function initializeServer() {
  console.error('[MCP] Initializing server components...');
  await scraper.initialize();
  await cache.initialize();
  console.error('[MCP] Server components initialized');
}

// Handle tool listing
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: toolDefinitions
  };
});

// Handle resources listing
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  const cachedUrls = await cache.list();
  const resources = cachedUrls.map(url => ({
    uri: url,
    name: url.split('/').pop() || url,
    description: `Cached documentation page: ${url}`,
    mimeType: 'text/html'
  }));
  
  return {
    resources
  };
});

// Handle resource reading
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;
  
  try {
    const content = await cache.get(uri);
    if (!content) {
      throw new Error(`Resource not found: ${uri}`);
    }
    
    return {
      contents: [{
        uri,
        mimeType: 'text/html',
        text: content
      }]
    };
  } catch (error) {
    throw new Error(`Failed to read resource: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
});

// Handle prompts listing
server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return {
    prompts: [
      {
        name: 'generate_graphql_query',
        description: 'Generate a GraphQL query for ikas API',
        arguments: [
          {
            name: 'entity',
            description: 'The entity to query (e.g., products, orders, customers)',
            required: true
          },
          {
            name: 'fields',
            description: 'Fields to retrieve (comma-separated)',
            required: true
          },
          {
            name: 'filters',
            description: 'Optional filters to apply',
            required: false
          }
        ]
      },
      {
        name: 'find_api_integration',
        description: 'Find specific API integration examples',
        arguments: [
          {
            name: 'integration_type',
            description: 'Type of integration (e.g., authentication, webhooks, file upload)',
            required: true
          },
          {
            name: 'language',
            description: 'Programming language (e.g., javascript, python, php)',
            required: false
          }
        ]
      },
      {
        name: 'debug_error',
        description: 'Debug an ikas API error',
        arguments: [
          {
            name: 'error_message',
            description: 'The error message or code',
            required: true
          },
          {
            name: 'context',
            description: 'Context where the error occurred',
            required: false
          }
        ]
      },
      {
        name: 'code_example_generator',
        description: 'Generate code examples for ikas API operations',
        arguments: [
          {
            name: 'operation',
            description: 'The operation to generate code for',
            required: true
          },
          {
            name: 'language',
            description: 'Target programming language',
            required: true
          }
        ]
      }
    ]
  };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'search_docs':
        return await toolHandlers.handleSearchDocs(args);
        
      case 'get_page':
        return await toolHandlers.handleGetPage(args);
        
      case 'cache_stats':
        return await toolHandlers.handleCacheStats();
        
      case 'find_graphql_type':
        return await toolHandlers.handleFindGraphQLType(args);
        
      case 'find_mutation':
        return await toolHandlers.handleFindMutation(args);
        
      case 'find_query':
        return await toolHandlers.handleFindQuery(args);
        
      case 'get_field_info':
        return await toolHandlers.handleGetFieldInfo(args);
        
      case 'find_code_example':
        return await toolHandlers.handleFindCodeExample(args);
        
      case 'get_api_endpoint':
        return await toolHandlers.handleGetAPIEndpoint(args);
        
      case 'list_categories': {
        const urls = await cache.list();
        const categories = new Set<string>();
        
        urls.forEach(url => {
          const parts = url.split('/');
          if (parts.length > 4) {
            categories.add(parts[4]);
          }
        });
        
        return {
          content: [{
            type: 'text',
            text: `# Documentation Categories\n\n${Array.from(categories).map(cat => `- ${cat}`).join('\n')}`
          }]
        };
      }
        
      case 'explain_error':
        return await toolHandlers.handleExplainError(args);
      
      case 'crawl_site':
        return await toolHandlers.handleCrawlSite(args);
        
      case 'rebuild_index':
        return await toolHandlers.handleRebuildIndex();
        
      case 'search_advanced':
        return await toolHandlers.handleSearchAdvanced(args);

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    console.error(`[MCP] Tool error (${name}):`, error);
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
        }
      ]
    };
  }
});

// Main entry point
async function main() {
  console.error('[MCP] Starting ikas-docs-scraper MCP server...');
  
  try {
    await initializeServer();
    
    const transport = new StdioServerTransport();
    await server.connect(transport);
    
    console.error('[MCP] Server started successfully');
  } catch (error) {
    console.error('[MCP] Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.error('[MCP] Shutting down...');
  await scraper.close();
  process.exit(0);
});

// Start the server
main().catch((error) => {
  console.error('[MCP] Fatal error:', error);
  process.exit(1);
});