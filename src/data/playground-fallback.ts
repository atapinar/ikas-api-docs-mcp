export const PLAYGROUND_INFO = `# ikas GraphQL Playground

The ikas GraphQL Playground is an interactive tool for exploring the ikas API. However, it requires authentication and loads content dynamically.

## What is the GraphQL Playground?

The GraphQL Playground provides:
- Interactive schema exploration
- Query/mutation builder
- Real-time API testing
- Schema documentation

## Accessing the Schema

To access the full GraphQL schema and documentation:

1. **Use the API documentation pages** - The schema is documented in detail at:
   - https://ikas.dev/docs/api/admin-api/products
   - https://ikas.dev/docs/api/admin-api/orders
   - https://ikas.dev/docs/api/admin-api/customers
   - https://ikas.dev/docs/api/admin-api/categories

2. **Use the MCP tools**:
   - \`find_graphql_type\` - Find specific type definitions
   - \`find_mutation\` - Find mutations for operations
   - \`find_query\` - Find queries for data fetching
   - \`crawl_site\` - Discover and cache all documentation

## GraphQL Endpoint

The ikas GraphQL API endpoint is:
\`\`\`
POST https://api.myikas.com/api/v1/admin/graphql
\`\`\`

## Authentication

All API requests require authentication via API tokens. See the authentication documentation for details.
`;