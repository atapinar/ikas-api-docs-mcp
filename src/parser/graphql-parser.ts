import * as cheerio from 'cheerio';
import { GraphQLSchema, CodeExample } from '../types/index.js';

export class GraphQLParser {
  /**
   * Extract all GraphQL schemas from HTML content
   */
  extractSchemas(html: string): GraphQLSchema[] {
    const $ = cheerio.load(html);
    const schemas: GraphQLSchema[] = [];
    
    // Check for GraphQL schema in script tags (common in playground)
    $('script').each((_, element) => {
      const scriptContent = $(element).html() || '';
      
      // Look for GraphQL schema patterns in JavaScript
      const schemaMatches = scriptContent.match(/["'`]([\s\S]*?(?:type|input|enum|interface)\s+\w+\s*\{[\s\S]*?\})["'`]/g);
      if (schemaMatches) {
        for (const match of schemaMatches) {
          // Clean up the match
          const cleaned = match.slice(1, -1) // Remove quotes
            .replace(/\\n/g, '\n') // Unescape newlines
            .replace(/\\"/g, '"') // Unescape quotes
            .replace(/\\\\/g, '\\'); // Unescape backslashes
            
          const schema = this.parseGraphQLSchema(cleaned);
          if (schema) {
            schemas.push(schema);
          }
        }
      }
    });
    
    // Find all code blocks
    const codeBlocks = [
      ...Array.from($('pre code')),
      ...Array.from($('.language-graphql')),
      ...Array.from($('.language-gql')),
      ...Array.from($('[class*="graphql"]')),
      ...Array.from($('code'))
    ];

    for (const element of codeBlocks) {
      const code = $(element).text().trim();
      
      // Skip small inline code snippets
      if (code.length < 20) continue;
      
      const schema = this.parseGraphQLSchema(code);
      if (schema) {
        schemas.push(schema);
      }
    }

    // Deduplicate schemas by their content
    const uniqueSchemas = this.deduplicateSchemas(schemas);
    
    return uniqueSchemas;
  }

  /**
   * Parse a code block to extract GraphQL schema information
   */
  private parseGraphQLSchema(code: string): GraphQLSchema | null {
    // GraphQL type definitions patterns
    const patterns = {
      type: /^\s*(type|interface)\s+(\w+)\s*{/m,
      input: /^\s*input\s+(\w+)\s*{/m,
      enum: /^\s*enum\s+(\w+)\s*{/m,
      query: /^\s*type\s+Query\s*{/m,
      mutation: /^\s*type\s+Mutation\s*{/m,
      fragment: /^\s*fragment\s+(\w+)\s+on\s+(\w+)\s*{/m,
      operation: /^\s*(query|mutation)\s+(\w+)?\s*(\([^)]*\))?\s*{/m
    };

    let schemaType: GraphQLSchema['type'] | null = null;
    let name = '';

    // Check for type definitions
    if (patterns.query.test(code)) {
      schemaType = 'query';
      name = 'Query';
    } else if (patterns.mutation.test(code)) {
      schemaType = 'mutation';
      name = 'Mutation';
    } else if (patterns.input.test(code)) {
      const match = code.match(patterns.input);
      if (match) {
        schemaType = 'input';
        name = match[1];
      }
    } else if (patterns.enum.test(code)) {
      const match = code.match(patterns.enum);
      if (match) {
        schemaType = 'enum';
        name = match[1];
      }
    } else if (patterns.type.test(code)) {
      const match = code.match(patterns.type);
      if (match) {
        schemaType = 'type';
        name = match[2];
      }
    } else if (patterns.operation.test(code)) {
      const match = code.match(patterns.operation);
      if (match) {
        schemaType = match[1] as 'query' | 'mutation';
        name = match[2] || `${match[1]}Operation`;
      }
    }

    if (!schemaType) return null;

    // Extract fields
    const fields = this.extractFields(code);

    return {
      raw: code,
      type: schemaType,
      name,
      fields
    };
  }

  /**
   * Extract field definitions from GraphQL schema
   */
  private extractFields(code: string): GraphQLSchema['fields'] {
    const fields: GraphQLSchema['fields'] = [];
    
    // Pattern to match field definitions
    // Matches: fieldName: Type! # Description
    const fieldPattern = /^\s*(\w+)\s*:\s*([^#\n]+?)(?:\s*#\s*(.*))?$/gm;
    
    let match;
    while ((match = fieldPattern.exec(code)) !== null) {
      const [, fieldName, fieldType, description] = match;
      
      // Skip GraphQL keywords
      if (['type', 'input', 'enum', 'interface', 'query', 'mutation'].includes(fieldName)) {
        continue;
      }

      fields.push({
        name: fieldName.trim(),
        type: fieldType.trim(),
        description: description?.trim()
      });
    }

    return fields.length > 0 ? fields : undefined;
  }

  /**
   * Remove duplicate schemas based on content
   */
  private deduplicateSchemas(schemas: GraphQLSchema[]): GraphQLSchema[] {
    const seen = new Map<string, GraphQLSchema>();
    
    for (const schema of schemas) {
      const key = `${schema.type}:${schema.name}:${schema.raw.length}`;
      
      if (!seen.has(key)) {
        seen.set(key, schema);
      } else {
        // Keep the one with more fields or longer content
        const existing = seen.get(key)!;
        if (schema.raw.length > existing.raw.length) {
          seen.set(key, schema);
        }
      }
    }

    return Array.from(seen.values());
  }

  /**
   * Extract code examples from HTML
   */
  extractCodeExamples(html: string): CodeExample[] {
    const $ = cheerio.load(html);
    const examples: CodeExample[] = [];

    // Find all code blocks with language indicators
    $('pre').each((_, preElement) => {
      const $pre = $(preElement);
      const $code = $pre.find('code');
      
      if ($code.length === 0) return;

      // Try to determine language
      let language = 'plaintext';
      const codeElement = $code[0];
      const className = $(codeElement).attr('class') || '';
      
      // Extract language from class name (e.g., language-javascript)
      const langMatch = className.match(/language-(\w+)/);
      if (langMatch) {
        language = langMatch[1];
      }

      // Get the code content
      const code = $code.text().trim();
      
      if (code.length === 0) return;

      // Try to find a title or description
      let title: string | undefined;
      let description: string | undefined;

      // Check for preceding heading
      const $prevHeading = $pre.prevAll('h1, h2, h3, h4, h5, h6').first();
      if ($prevHeading.length > 0) {
        title = $prevHeading.text().trim();
      }

      // Check for preceding paragraph
      const $prevP = $pre.prev('p');
      if ($prevP.length > 0) {
        description = $prevP.text().trim();
      }

      examples.push({
        language,
        code,
        title,
        description
      });
    });

    return examples;
  }

  /**
   * Extract API endpoint information
   */
  extractAPIEndpoints(html: string): Array<{
    method: string;
    url: string;
    description?: string;
  }> {
    const $ = cheerio.load(html);
    const endpoints: Array<{ method: string; url: string; description?: string }> = [];

    // Look for common API endpoint patterns
    const patterns = [
      /\b(GET|POST|PUT|DELETE|PATCH)\s+(\/[^\s]+)/g,
      /\b(GET|POST|PUT|DELETE|PATCH)\s+`([^`]+)`/g,
      /\bhttps?:\/\/api\.myikas\.com[^\s]*/g
    ];

    const text = $('body').text();
    
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        if (match[1] && match[2]) {
          endpoints.push({
            method: match[1],
            url: match[2]
          });
        } else if (match[0]) {
          // Full URL without method
          endpoints.push({
            method: 'GET',
            url: match[0]
          });
        }
      }
    }

    // Also check for GraphQL endpoint
    if (text.includes('graphql') && text.includes('api.myikas.com')) {
      endpoints.push({
        method: 'POST',
        url: 'https://api.myikas.com/api/v1/admin/graphql',
        description: 'GraphQL API endpoint'
      });
    }

    // Deduplicate
    const unique = Array.from(
      new Map(endpoints.map(e => [`${e.method}:${e.url}`, e])).values()
    );

    return unique;
  }
}