import { IkasScraper } from '../scraper/core.js';
import { FileCache } from '../cache/file-cache.js';
import { toolSchemas } from './tools.js';
import { ExtractedContent } from '../parser/content-extractor.js';
import { SmartCrawler } from '../scraper/crawler.js';
import { SearchIndex } from '../search/search-index.js';

export class ToolHandlers {
  private crawler: SmartCrawler;
  private searchIndex: SearchIndex;
  
  constructor(
    private scraper: IkasScraper,
    private cache: FileCache
  ) {
    this.crawler = new SmartCrawler(scraper, cache);
    this.searchIndex = new SearchIndex();
    
    // Initialize search index on startup
    this.initializeSearchIndex().catch(console.error);
  }
  
  private async initializeSearchIndex(): Promise<void> {
    console.error('[Search] Initializing search index...');
    const urls = await this.cache.list();
    
    for (const url of urls) {
      const entry = await this.cache.get(url);
      if (entry) {
        this.searchIndex.addDocument(entry.page);
      }
    }
    
    const stats = this.searchIndex.getStats();
    console.error(`[Search] Index initialized with ${stats.totalDocuments} documents`);
  }

  async handleSearchDocs(args: unknown) {
    const { query } = toolSchemas.searchDocs.parse(args);
    
    // Use the search index for better results
    const results = this.searchIndex.search(query, { limit: 10 });
    
    if (results.length === 0) {
      return {
        content: [{
          type: 'text',
          text: `No results found for "${query}". Try crawling more pages with crawl_site or use search_advanced for more options.`
        }]
      };
    }
    
    const resultText = results.map((r, i) => 
      `${i + 1}. **${r.title}**\n   ${r.url}\n   _${r.snippet}_`
    ).join('\n\n');
    
    return {
      content: [{
        type: 'text',
        text: `# Search Results for "${query}"\n\nFound ${results.length} results:\n\n${resultText}`
      }]
    };
  }

  async handleGetPage(args: unknown) {
    const { url } = toolSchemas.getPage.parse(args);
    
    // Allow both /docs/ and /playground URLs
    if (!url.startsWith('https://ikas.dev/docs/') && !url.startsWith('https://ikas.dev/playground')) {
      throw new Error('URL must be from ikas.dev/docs/ or ikas.dev/playground');
    }

    let entry = await this.cache.get(url);
    
    if (!entry) {
      console.error(`[MCP] Scraping: ${url}`);
      const page = await this.scraper.scrapePage(url);
      await this.cache.set(url, page);
      entry = { page, lastModified: new Date().toISOString() };
    }

    return {
      content: [{
        type: 'text',
        text: `# ${entry.page.title}\n\n${entry.page.content}\n\n---\n*Cached at: ${entry.lastModified}*`
      }]
    };
  }

  async handleFindGraphQLType(args: unknown) {
    const { typeName } = toolSchemas.findGraphQLType.parse(args);
    
    const urls = await this.cache.list();
    const typeMatches: Array<{ url: string; schema: any; exact: boolean }> = [];
    
    for (const url of urls) {
      const entry = await this.cache.get(url);
      if (!entry?.page.extractedContent) continue;
      
      const extracted = entry.page.extractedContent as ExtractedContent;
      
      for (const schema of extracted.graphqlSchemas) {
        if (schema.name && schema.name.toLowerCase() === typeName.toLowerCase()) {
          typeMatches.push({ url, schema, exact: true });
        } else if (schema.name && schema.name.toLowerCase().includes(typeName.toLowerCase())) {
          typeMatches.push({ url, schema, exact: false });
        }
      }
    }
    
    // Sort exact matches first
    typeMatches.sort((a, b) => {
      if (a.exact && !b.exact) return -1;
      if (!a.exact && b.exact) return 1;
      return 0;
    });
    
    if (typeMatches.length === 0) {
      return {
        content: [{
          type: 'text',
          text: `No GraphQL type found matching "${typeName}". Try searching for: Product, Order, Customer, Category, etc.`
        }]
      };
    }
    
    const match = typeMatches[0];
    let result = `# GraphQL Type: ${match.schema.name}\n\n`;
    result += `**Type**: ${match.schema.type}\n`;
    result += `**Found in**: ${match.url}\n\n`;
    
    if (match.schema.fields && match.schema.fields.length > 0) {
      result += `## Fields\n\n`;
      for (const field of match.schema.fields) {
        result += `- **${field.name}**: \`${field.type}\``;
        if (field.description) {
          result += ` - ${field.description}`;
        }
        result += '\n';
      }
    }
    
    result += `\n## Full Schema\n\n\`\`\`graphql\n${match.schema.raw}\n\`\`\``;
    
    return {
      content: [{
        type: 'text',
        text: result
      }]
    };
  }

  async handleFindMutation(args: unknown) {
    const { action, entity } = toolSchemas.findMutation.parse(args);
    
    const urls = await this.cache.list();
    const mutations: Array<{ url: string; name: string; description?: string; example?: string }> = [];
    
    // Common mutation patterns
    const actionMap: Record<string, string[]> = {
      'create': ['create', 'save', 'add', 'new'],
      'update': ['update', 'save', 'edit', 'modify'],
      'delete': ['delete', 'remove', 'destroy']
    };
    
    const searchTerms = actionMap[action.toLowerCase()] || [action.toLowerCase()];
    const entityLower = entity.toLowerCase();
    
    for (const url of urls) {
      const entry = await this.cache.get(url);
      if (!entry) continue;
      
      // Search in page content for mutations
      
      // Look for mutation patterns in content
      const mutationRegex = /mutation[s]?\s*[​]?\s*([a-zA-Z0-9_]+)/gi;
      let match;
      
      while ((match = mutationRegex.exec(entry.page.content)) !== null) {
        const mutationName = match[1];
        const mutationNameLower = mutationName.toLowerCase();
        
        // Check if mutation matches our search criteria
        const matchesEntity = mutationNameLower.includes(entityLower) || 
                             entityLower.includes(mutationNameLower.replace(/s$/, ''));
        const matchesAction = searchTerms.some(term => mutationNameLower.includes(term));
        
        if (matchesEntity && matchesAction) {
          // Extract context around the mutation
          const contextStart = Math.max(0, match.index - 200);
          const contextEnd = Math.min(entry.page.content.length, match.index + 500);
          const context = entry.page.content.substring(contextStart, contextEnd);
          
          mutations.push({
            url,
            name: mutationName,
            description: context.substring(0, 200) + '...',
            example: this.extractMutationExample(context, mutationName)
          });
        }
      }
      
      // Also check in code examples
      if (entry.page.extractedContent) {
        const extracted = entry.page.extractedContent as ExtractedContent;
        
        for (const example of extracted.codeExamples) {
          if (example.language === 'graphql' || example.code.includes('mutation')) {
            const codeLower = example.code.toLowerCase();
            
            searchTerms.forEach(term => {
              if (codeLower.includes(term) && codeLower.includes(entityLower)) {
                // Extract mutation name from code
                const mutationMatch = example.code.match(/mutation\s+(\w+)|(\w+)\s*\(/);
                if (mutationMatch) {
                  mutations.push({
                    url,
                    name: mutationMatch[1] || mutationMatch[2] || 'Unknown',
                    description: example.description || example.title,
                    example: example.code
                  });
                }
              }
            });
          }
        }
      }
    }
    
    // Deduplicate mutations by name
    const uniqueMutations = Array.from(
      new Map(mutations.map(m => [m.name, m])).values()
    );
    
    if (uniqueMutations.length === 0) {
      return {
        content: [{
          type: 'text',
          text: `No mutations found for "${action} ${entity}". Try:\n` +
                `- Using different terms (e.g., "save" instead of "create")\n` +
                `- Searching for the entity directly with search_docs\n` +
                `- Checking specific API pages with get_page`
        }]
      };
    }
    
    let result = `# Mutations for ${action} ${entity}\n\n`;
    result += `Found ${uniqueMutations.length} matching mutations:\n\n`;
    
    uniqueMutations.forEach((mutation, i) => {
      result += `## ${i + 1}. ${mutation.name}\n`;
      result += `**Source**: ${mutation.url}\n\n`;
      
      if (mutation.description) {
        result += `**Description**: ${mutation.description}\n\n`;
      }
      
      if (mutation.example) {
        result += `**Example**:\n\`\`\`graphql\n${mutation.example}\n\`\`\`\n\n`;
      }
    });
    
    return {
      content: [{
        type: 'text',
        text: result
      }]
    };
  }
  
  private extractMutationExample(context: string, mutationName: string): string | undefined {
    // Try to extract a code example from the context
    const codeMatch = context.match(/```[\s\S]*?```/);
    if (codeMatch && codeMatch[0].includes(mutationName)) {
      return codeMatch[0].replace(/```\w*\n?/g, '').trim();
    }
    
    // Try to extract inline mutation syntax
    const inlineMatch = context.match(new RegExp(`${mutationName}\\s*\\([^)]*\\)[^}]*}`, 'i'));
    if (inlineMatch) {
      return inlineMatch[0];
    }
    
    return undefined;
  }

  async handleFindCodeExample(args: unknown) {
    const { topic, language } = toolSchemas.findCodeExample.parse(args);
    
    const urls = await this.cache.list();
    const examples: Array<{ url: string; example: any; relevance: number }> = [];
    
    for (const url of urls) {
      const entry = await this.cache.get(url);
      if (!entry?.page.extractedContent) continue;
      
      const extracted = entry.page.extractedContent as ExtractedContent;
      
      for (const example of extracted.codeExamples) {
        // Check language match if specified
        if (language && example.language !== language) continue;
        
        // Calculate relevance
        let relevance = 0;
        const topicLower = topic.toLowerCase();
        
        if (example.title?.toLowerCase().includes(topicLower)) relevance += 10;
        if (example.description?.toLowerCase().includes(topicLower)) relevance += 5;
        if (example.code.toLowerCase().includes(topicLower)) relevance += 1;
        
        if (relevance > 0) {
          examples.push({ url, example, relevance });
        }
      }
    }
    
    // Sort by relevance
    examples.sort((a, b) => b.relevance - a.relevance);
    
    if (examples.length === 0) {
      return {
        content: [{
          type: 'text',
          text: `No code examples found for "${topic}"${language ? ` in ${language}` : ''}. Try searching for more specific terms.`
        }]
      };
    }
    
    const topExample = examples[0];
    let result = `# Code Example: ${topExample.example.title || topic}\n\n`;
    result += `**Language**: ${topExample.example.language}\n`;
    result += `**Source**: ${topExample.url}\n\n`;
    
    if (topExample.example.description) {
      result += `## Description\n\n${topExample.example.description}\n\n`;
    }
    
    result += `## Code\n\n\`\`\`${topExample.example.language}\n${topExample.example.code}\n\`\`\``;
    
    if (examples.length > 1) {
      result += `\n\n---\n\n*Found ${examples.length - 1} more examples. Use more specific search terms to refine results.*`;
    }
    
    return {
      content: [{
        type: 'text',
        text: result
      }]
    };
  }

  async handleCacheStats() {
    const stats = await this.cache.getStats();
    const urls = await this.cache.list();

    return {
      content: [{
        type: 'text',
        text: `# Cache Statistics\n\n` +
              `- Total entries: ${stats.totalEntries}\n` +
              `- Total size: ${(stats.totalSize / 1024).toFixed(2)} KB\n` +
              `- Oldest entry: ${stats.oldestEntry || 'N/A'}\n` +
              `- Newest entry: ${stats.newestEntry || 'N/A'}\n\n` +
              `## Cached URLs:\n${urls.map(url => `- ${url}`).join('\n')}`
      }]
    };
  }

  async handleCrawlSite(args: unknown) {
    const { maxPages = 50, delayMs = 1000 } = toolSchemas.crawlSite.parse(args);
    
    const result = await this.crawler.crawl({
      maxPages,
      delayMs
    });
    
    // Rebuild search index after crawl
    await this.rebuildSearchIndex();
    
    return {
      content: [{
        type: 'text',
        text: `# Crawl Complete\n\n` +
              `**Duration**: ${(result.duration / 1000).toFixed(2)}s\n` +
              `**Pages discovered**: ${result.urlsDiscovered.length}\n` +
              `**Pages crawled**: ${result.urlsCrawled.length}\n` +
              `**Failed**: ${result.urlsFailed.length}\n\n` +
              `## New Pages:\n${result.urlsCrawled.slice(-10).map(url => `- ${url}`).join('\n')}\n\n` +
              `*Search index has been updated with new content.*`
      }]
    };
  }

  async handleRebuildIndex() {
    const count = await this.rebuildSearchIndex();
    
    const stats = this.searchIndex.getStats();
    
    return {
      content: [{
        type: 'text',
        text: `# Search Index Rebuilt\n\n` +
              `**Documents indexed**: ${count}\n` +
              `**Total keywords**: ${stats.totalKeywords}\n` +
              `**GraphQL types**: ${stats.totalGraphQLTypes}\n\n` +
              `## Categories:\n${stats.categories.map(c => `- ${c.name}: ${c.count} pages`).join('\n')}`
      }]
    };
  }

  async handleSearchAdvanced(args: unknown) {
    const { query, category, type, limit = 10 } = toolSchemas.searchAdvanced.parse(args);
    
    const results = this.searchIndex.search(query, { category, type, limit });
    
    if (results.length === 0) {
      return {
        content: [{
          type: 'text',
          text: `No results found for "${query}"${category ? ` in category: ${category}` : ''}${type ? ` of type: ${type}` : ''}`
        }]
      };
    }
    
    let text = `# Search Results for "${query}"\n\n`;
    if (category || type) {
      text += `**Filters**: ${category ? `category=${category} ` : ''}${type ? `type=${type}` : ''}\n\n`;
    }
    
    text += `Found ${results.length} results:\n\n`;
    
    results.forEach((result, i) => {
      text += `## ${i + 1}. ${result.title}\n`;
      text += `**URL**: ${result.url}\n`;
      text += `**Score**: ${result.score}\n`;
      text += `**Matches**: `;
      const matchTypes = [];
      if (result.matches.title) matchTypes.push('title');
      if (result.matches.keywords) matchTypes.push('keywords');
      if (result.matches.graphql) matchTypes.push('GraphQL');
      if (result.matches.content) matchTypes.push('content');
      text += matchTypes.join(', ') + '\n';
      text += `\n${result.snippet}\n\n---\n\n`;
    });
    
    return {
      content: [{
        type: 'text',
        text
      }]
    };
  }

  private async rebuildSearchIndex(): Promise<number> {
    this.searchIndex.clear();
    
    const urls = await this.cache.list();
    let count = 0;
    
    for (const url of urls) {
      const entry = await this.cache.get(url);
      if (entry) {
        this.searchIndex.addDocument(entry.page);
        count++;
      }
    }
    
    return count;
  }

  async handleFindQuery(args: unknown) {
    const { entity, operation } = toolSchemas.findQuery.parse(args);
    
    const urls = await this.cache.list();
    const queries: Array<{ url: string; query: string; description?: string }> = [];
    
    for (const url of urls) {
      const entry = await this.cache.get(url);
      if (!entry?.page.extractedContent) continue;
      
      const extracted = entry.page.extractedContent as ExtractedContent;
      
      // Search in GraphQL schemas
      for (const schema of extracted.graphqlSchemas) {
        const lowerEntity = entity.toLowerCase();
        const lowerQuery = (schema.query || '').toLowerCase();
        
        if (lowerQuery.includes(lowerEntity) || 
            (operation && lowerQuery.includes(operation.toLowerCase()))) {
          queries.push({
            url,
            query: schema.query || '',
            description: schema.description
          });
        }
      }
      
      // Search in code examples
      for (const example of extracted.codeExamples) {
        if (example.language === 'graphql' || example.language === 'gql') {
          const lowerCode = example.code.toLowerCase();
          if (lowerCode.includes(entity.toLowerCase()) && lowerCode.includes('query')) {
            queries.push({
              url,
              query: example.code,
              description: example.description || example.title
            });
          }
        }
      }
    }
    
    if (queries.length === 0) {
      return {
        content: [{
          type: 'text',
          text: `No queries found for "${entity}"${operation ? ` with operation "${operation}"` : ''}. Try using search_docs or find_graphql_type.`
        }]
      };
    }
    
    let result = `# GraphQL Queries for ${entity}\n\n`;
    result += `Found ${queries.length} matching queries:\n\n`;
    
    queries.slice(0, 5).forEach((q, i) => {
      result += `## ${i + 1}. ${q.description || 'Query'}\n`;
      result += `Source: ${q.url}\n\n`;
      result += `\`\`\`graphql\n${q.query}\n\`\`\`\n\n`;
    });
    
    return {
      content: [{
        type: 'text',
        text: result
      }]
    };
  }

  async handleGetFieldInfo(args: unknown) {
    const { typeName, fieldName } = toolSchemas.getFieldInfo.parse(args);
    
    // First, find the type
    const urls = await this.cache.list();
    let typeInfo: any = null;
    let fieldInfo: any = null;
    let sourceUrl = '';
    
    for (const url of urls) {
      const entry = await this.cache.get(url);
      if (!entry?.page.extractedContent) continue;
      
      const extracted = entry.page.extractedContent as ExtractedContent;
      
      for (const schema of extracted.graphqlSchemas) {
        if (schema.type?.toLowerCase() === typeName.toLowerCase()) {
          typeInfo = schema;
          sourceUrl = url;
          
          // Look for field in schema description or other content
          const schemaText = JSON.stringify(schema);
          if (schemaText.toLowerCase().includes(fieldName.toLowerCase())) {
            fieldInfo = { found: true, inSchema: true };
          }
          break;
        }
      }
      
      if (typeInfo) break;
    }
    
    if (!typeInfo) {
      return {
        content: [{
          type: 'text',
          text: `Type "${typeName}" not found. Use find_graphql_type to list available types.`
        }]
      };
    }
    
    let result = `# Field Information: ${typeName}.${fieldName}\n\n`;
    result += `**Type**: ${typeName}\n`;
    result += `**Source**: ${sourceUrl}\n\n`;
    
    if (typeInfo.description) {
      result += `## Type Description\n${typeInfo.description}\n\n`;
    }
    
    if (fieldInfo) {
      result += `## Field Details\n`;
      result += `The field "${fieldName}" is part of the ${typeName} type.\n\n`;
      result += `For complete field details, use:\n`;
      result += `- \`find_graphql_type\` to see all fields of ${typeName}\n`;
      result += `- \`get_page\` with URL: ${sourceUrl}\n`;
    } else {
      result += `⚠️ Field "${fieldName}" not found in ${typeName}.\n\n`;
      result += `Use \`find_graphql_type {"typeName": "${typeName}"}\` to see available fields.`;
    }
    
    return {
      content: [{
        type: 'text',
        text: result
      }]
    };
  }

  async handleGetAPIEndpoint(args: unknown) {
    const { operation } = toolSchemas.getAPIEndpoint.parse(args);
    
    const urls = await this.cache.list();
    const endpoints: Array<{ url: string; endpoint: any }> = [];
    
    for (const url of urls) {
      const entry = await this.cache.get(url);
      if (!entry?.page.extractedContent) continue;
      
      const extracted = entry.page.extractedContent as ExtractedContent;
      
      for (const endpoint of extracted.apiEndpoints) {
        const lowerOp = operation.toLowerCase();
        const endpointStr = JSON.stringify(endpoint).toLowerCase();
        
        if (endpointStr.includes(lowerOp)) {
          endpoints.push({ url, endpoint });
        }
      }
    }
    
    if (endpoints.length === 0) {
      return {
        content: [{
          type: 'text',
          text: `No API endpoints found for operation "${operation}". Try searching with different terms or use search_docs.`
        }]
      };
    }
    
    let result = `# API Endpoints for "${operation}"\n\n`;
    result += `Found ${endpoints.length} matching endpoints:\n\n`;
    
    endpoints.slice(0, 10).forEach((e, i) => {
      result += `## ${i + 1}. ${e.endpoint.method} ${e.endpoint.url}\n`;
      if (e.endpoint.description) {
        result += `${e.endpoint.description}\n`;
      }
      result += `Source: ${e.url}\n\n`;
    });
    
    return {
      content: [{
        type: 'text',
        text: result
      }]
    };
  }

  async handleExplainError(args: unknown) {
    const { error } = toolSchemas.explainError.parse(args);
    
    // Search for the error in documentation
    const searchResults = this.searchIndex.search(error, { limit: 5 });
    
    let result = `# Error Explanation: "${error}"\n\n`;
    
    if (searchResults.length > 0) {
      result += `## Related Documentation\n\n`;
      
      for (const res of searchResults) {
        result += `### ${res.title}\n`;
        result += `${res.url}\n`;
        result += `${res.snippet}\n\n`;
      }
      
      result += `## Common Solutions\n\n`;
      result += `1. Check the related documentation above for specific error handling\n`;
      result += `2. Verify your API credentials and permissions\n`;
      result += `3. Ensure request format matches the API specification\n`;
      result += `4. Check rate limits and quotas\n\n`;
    } else {
      result += `No specific documentation found for this error.\n\n`;
      result += `## General Troubleshooting Steps\n\n`;
      result += `1. Search for the error using \`search_docs {"query": "${error}"}\`\n`;
      result += `2. Check the API reference documentation\n`;
      result += `3. Verify authentication and authorization\n`;
      result += `4. Review request/response logs\n`;
      result += `5. Check ikas status page for any ongoing issues\n\n`;
    }
    
    result += `## Need More Help?\n\n`;
    result += `- Use \`find_code_example\` to find working examples\n`;
    result += `- Check specific API endpoints with \`get_api_endpoint\`\n`;
    result += `- Browse full documentation with \`get_page\``;
    
    return {
      content: [{
        type: 'text',
        text: result
      }]
    };
  }
}