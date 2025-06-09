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
        if (schema.name.toLowerCase() === typeName.toLowerCase()) {
          typeMatches.push({ url, schema, exact: true });
        } else if (schema.name.toLowerCase().includes(typeName.toLowerCase())) {
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
    const mutations: Array<{ url: string; name: string; schema: any }> = [];
    
    // Common mutation patterns
    const patterns = [
      `${action}${entity}`,
      `${entity}${action}`,
      `save${entity}`,
      `${action}${entity}s`,
      `${entity}Create`,
      `${entity}Update`,
      `${entity}Delete`
    ];
    
    for (const url of urls) {
      const entry = await this.cache.get(url);
      if (!entry?.page.extractedContent) continue;
      
      const extracted = entry.page.extractedContent as ExtractedContent;
      
      for (const schema of extracted.graphqlSchemas) {
        if (schema.type !== 'mutation') continue;
        
        if (schema.fields) {
          for (const field of schema.fields) {
            for (const pattern of patterns) {
              if (field.name.toLowerCase().includes(pattern.toLowerCase())) {
                mutations.push({
                  url,
                  name: field.name,
                  schema: field
                });
                break;
              }
            }
          }
        }
      }
    }
    
    if (mutations.length === 0) {
      return {
        content: [{
          type: 'text',
          text: `No mutation found for "${action} ${entity}". Try searching documentation pages that contain GraphQL mutations.`
        }]
      };
    }
    
    const mutation = mutations[0];
    let result = `# Mutation: ${mutation.name}\n\n`;
    result += `**Operation**: ${action} ${entity}\n`;
    result += `**Found in**: ${mutation.url}\n\n`;
    result += `## Signature\n\n\`\`\`graphql\n${mutation.name}: ${mutation.schema.type}\n\`\`\``;
    
    if (mutation.schema.description) {
      result += `\n\n## Description\n\n${mutation.schema.description}`;
    }
    
    return {
      content: [{
        type: 'text',
        text: result
      }]
    };
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
}