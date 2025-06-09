import { z } from 'zod';

export const toolSchemas = {
  // Basic tools
  searchDocs: z.object({
    query: z.string().describe('Search query for ikas documentation')
  }),
  
  getPage: z.object({
    url: z.string().describe('Full URL of the ikas documentation page or playground')
  }),
  
  cacheStats: z.object({}),
  
  // GraphQL specific tools
  findGraphQLType: z.object({
    typeName: z.string().describe('Name of the GraphQL type to find (e.g., Product, Order)')
  }),
  
  findMutation: z.object({
    action: z.string().describe('Action to perform (e.g., create, update, delete)'),
    entity: z.string().describe('Entity to act on (e.g., product, order, customer)')
  }),
  
  findQuery: z.object({
    entity: z.string().describe('Entity to query (e.g., products, orders, customers)'),
    operation: z.string().optional().describe('Specific operation like list, get, search')
  }),
  
  getFieldInfo: z.object({
    typeName: z.string().describe('GraphQL type name'),
    fieldName: z.string().describe('Field name to get information about')
  }),
  
  // Code example tools
  findCodeExample: z.object({
    topic: z.string().describe('Topic or operation to find code examples for'),
    language: z.string().optional().describe('Programming language (e.g., javascript, graphql)')
  }),
  
  // API tools
  getAPIEndpoint: z.object({
    operation: z.string().describe('Operation like upload, webhook, auth')
  }),
  
  // Navigation tools
  listCategories: z.object({}),
  
  explainError: z.object({
    error: z.string().describe('Error message or code to explain')
  }),
  
  // Crawling tools
  crawlSite: z.object({
    maxPages: z.number().optional().describe('Maximum number of pages to crawl (default: 50)'),
    delayMs: z.number().optional().describe('Delay between requests in milliseconds (default: 1000)')
  }),
  
  rebuildIndex: z.object({}),
  
  searchAdvanced: z.object({
    query: z.string().describe('Search query'),
    category: z.string().optional().describe('Filter by category (api, guides, etc.)'),
    type: z.string().optional().describe('Filter by type (graphql, api, guide)'),
    limit: z.number().optional().describe('Maximum results to return (default: 10)')
  })
};

export const toolDefinitions = [
  {
    name: 'search_docs',
    description: 'Search ikas documentation for specific information',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query for ikas documentation'
        }
      },
      required: ['query']
    }
  },
  {
    name: 'get_page',
    description: 'Get a specific documentation page or playground by URL',
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'Full URL of the ikas documentation page or playground (e.g., https://ikas.dev/docs/intro or https://ikas.dev/playground)'
        }
      },
      required: ['url']
    }
  },
  {
    name: 'cache_stats',
    description: 'Get statistics about the documentation cache',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'find_graphql_type',
    description: 'Find a specific GraphQL type definition in ikas API',
    inputSchema: {
      type: 'object',
      properties: {
        typeName: {
          type: 'string',
          description: 'Name of the GraphQL type to find (e.g., Product, Order)'
        }
      },
      required: ['typeName']
    }
  },
  {
    name: 'find_mutation',
    description: 'Find the appropriate mutation for a specific action',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          description: 'Action to perform (e.g., create, update, delete)'
        },
        entity: {
          type: 'string',
          description: 'Entity to act on (e.g., product, order, customer)'
        }
      },
      required: ['action', 'entity']
    }
  },
  {
    name: 'find_query',
    description: 'Find the appropriate query for fetching data',
    inputSchema: {
      type: 'object',
      properties: {
        entity: {
          type: 'string',
          description: 'Entity to query (e.g., products, orders, customers)'
        },
        operation: {
          type: 'string',
          description: 'Specific operation like list, get, search'
        }
      },
      required: ['entity']
    }
  },
  {
    name: 'get_field_info',
    description: 'Get information about a specific field in a GraphQL type',
    inputSchema: {
      type: 'object',
      properties: {
        typeName: {
          type: 'string',
          description: 'GraphQL type name'
        },
        fieldName: {
          type: 'string',
          description: 'Field name to get information about'
        }
      },
      required: ['typeName', 'fieldName']
    }
  },
  {
    name: 'find_code_example',
    description: 'Find code examples for specific operations',
    inputSchema: {
      type: 'object',
      properties: {
        topic: {
          type: 'string',
          description: 'Topic or operation to find code examples for'
        },
        language: {
          type: 'string',
          description: 'Programming language (e.g., javascript, graphql)'
        }
      },
      required: ['topic']
    }
  },
  {
    name: 'get_api_endpoint',
    description: 'Get API endpoint information for specific operations',
    inputSchema: {
      type: 'object',
      properties: {
        operation: {
          type: 'string',
          description: 'Operation like upload, webhook, auth'
        }
      },
      required: ['operation']
    }
  },
  {
    name: 'list_categories',
    description: 'List all available documentation categories',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'explain_error',
    description: 'Explain an ikas API error and provide solutions',
    inputSchema: {
      type: 'object',
      properties: {
        error: {
          type: 'string',
          description: 'Error message or code to explain'
        }
      },
      required: ['error']
    }
  },
  {
    name: 'crawl_site',
    description: 'Crawl the ikas documentation site to discover and cache pages',
    inputSchema: {
      type: 'object',
      properties: {
        maxPages: {
          type: 'number',
          description: 'Maximum number of pages to crawl (default: 50)'
        },
        delayMs: {
          type: 'number',
          description: 'Delay between requests in milliseconds (default: 1000)'
        }
      }
    }
  },
  {
    name: 'rebuild_index',
    description: 'Rebuild the search index from all cached pages',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'search_advanced',
    description: 'Advanced search with filtering by category and type',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query'
        },
        category: {
          type: 'string',
          description: 'Filter by category (api, guides, etc.)'
        },
        type: {
          type: 'string',
          description: 'Filter by type (graphql, api, guide)'
        },
        limit: {
          type: 'number',
          description: 'Maximum results to return (default: 10)'
        }
      },
      required: ['query']
    }
  }
];