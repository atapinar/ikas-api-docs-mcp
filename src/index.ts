#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import path from 'path';
import { fileURLToPath } from 'url';

import { IkasScraper } from './scraper/core.js';
import { FileCache } from './cache/file-cache.js';
import { toolDefinitions, toolSchemas } from './mcp/tools.js';
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
        
      case 'find_query': {
        const { entity, operation } = toolSchemas.findQuery.parse(args);
        // Similar to mutation but for queries
        return {
          content: [{
            type: 'text',
            text: `Finding query for ${entity} ${operation || ''}...\n\nThis feature is coming soon. For now, use get_page to browse GraphQL documentation.`
          }]
        };
      }
        
      case 'get_field_info': {
        const { typeName, fieldName } = toolSchemas.getFieldInfo.parse(args);
        return {
          content: [{
            type: 'text',
            text: `Getting field info for ${typeName}.${fieldName}...\n\nThis feature is coming soon. Use find_graphql_type to see all fields.`
          }]
        };
      }
        
      case 'find_code_example':
        return await toolHandlers.handleFindCodeExample(args);
        
      case 'get_api_endpoint': {
        const { operation } = toolSchemas.getAPIEndpoint.parse(args);
        return {
          content: [{
            type: 'text',
            text: `Looking for API endpoint for ${operation}...\n\nThis feature is coming soon. Check the extracted API endpoints from get_page.`
          }]
        };
      }
        
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
        
      case 'explain_error': {
        const { error } = toolSchemas.explainError.parse(args);
        return {
          content: [{
            type: 'text',
            text: `Explaining error: "${error}"...\n\nThis feature is coming soon. Search for the error message using search_docs.`
          }]
        };
      }
      
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