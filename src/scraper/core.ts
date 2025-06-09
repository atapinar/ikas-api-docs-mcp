import puppeteer, { Browser } from 'puppeteer';
import * as cheerio from 'cheerio';
import axios from 'axios';
import { createHash } from 'crypto';
import { ScrapedPage } from '../types/index.js';
import { ContentExtractor } from '../parser/content-extractor.js';
import { PLAYGROUND_INFO } from '../data/playground-fallback.js';

export class IkasScraper {
  private browser: Browser | null = null;
  private userAgent = 'ikas-docs-scraper/1.0 (MCP Server)';
  private contentExtractor: ContentExtractor;
  // private baseUrl = 'https://ikas.dev'; // TODO: Use for URL validation

  constructor() {
    this.contentExtractor = new ContentExtractor();
  }

  async initialize(): Promise<void> {
    this.browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  async scrapePage(url: string): Promise<ScrapedPage> {
    console.error(`[Scraper] Fetching: ${url}`);
    
    // Skip axios for playground, go straight to Puppeteer
    if (url.includes('/playground')) {
      return await this.scrapeWithPuppeteer(url);
    }
    
    // First, try with axios for simple pages
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'text/html,application/xhtml+xml'
        },
        timeout: 15000
      });

      const html = response.data;
      const $ = cheerio.load(html);

      // Check if page requires JavaScript rendering
      const hasReactRoot = $('#__next').length > 0 || $('.react-root').length > 0;
      const hasEmptyContent = $('main').text().trim().length < 100;

      if (hasReactRoot || hasEmptyContent) {
        console.error('[Scraper] Page requires JavaScript rendering, using Puppeteer');
        return await this.scrapeWithPuppeteer(url);
      }

      return this.extractContent(html, url);
    } catch (error) {
      console.error('[Scraper] Axios failed, falling back to Puppeteer:', error);
      return await this.scrapeWithPuppeteer(url);
    }
  }

  private async scrapeWithPuppeteer(url: string): Promise<ScrapedPage> {
    if (!this.browser) {
      await this.initialize();
    }

    const page = await this.browser!.newPage();
    try {
      await page.setUserAgent(this.userAgent);
      
      // Enable console logging for debugging
      page.on('console', msg => {
        if (msg.type() === 'error') {
          console.error('[Browser Console]', msg.text());
        }
      });
      
      await page.goto(url, {
        waitUntil: 'domcontentloaded', // Faster than networkidle2
        timeout: 15000
      });

      // Special handling for playground
      if (url.includes('/playground')) {
        console.error('[Scraper] Waiting for GraphQL playground to load...');
        
        // Wait for GraphQL-specific elements with shorter timeout
        try {
          await page.waitForSelector('.graphiql-container, .playground, [class*="graphql"], [class*="GraphQL"]', {
            timeout: 5000
          });
        } catch {
          console.error('[Scraper] GraphQL container not found, using fallback content');
        }
        
        // Shorter wait for dynamic content
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Try to expand the schema if there's a button
        try {
          const schemaButton = await page.$('button[title*="schema"], button[aria-label*="schema"], .schema-button');
          if (schemaButton) {
            await schemaButton.click();
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } catch {
          // Schema button not found or already expanded
        }
      } else {
        // Standard content wait for documentation pages
        await page.waitForSelector('main, article, .content, .docs-content', {
          timeout: 10000
        }).catch(() => {
          console.error('[Scraper] No main content selector found, continuing anyway');
        });
      }

      // Get the fully rendered content
      const html = await page.content();
      
      // For playground, also try to get the text content
      if (url.includes('/playground')) {
        const bodyText = await page.evaluate(() => {
          return document.body ? document.body.innerText : '';
        });
        console.error(`[Scraper] Playground text content length: ${bodyText.length}`);
      }
      
      return this.extractContent(html, url);
    } finally {
      await page.close();
    }
  }

  private extractContent(html: string, url: string): ScrapedPage {
    // Use the enhanced content extractor
    let extractedContent = this.contentExtractor.extract(html, url);
    
    // Special handling for playground with minimal content
    if (url.includes('/playground') && extractedContent.content.length < 100) {
      console.error('[Scraper] Using fallback content for playground');
      
      // Override with helpful fallback content
      extractedContent = {
        ...extractedContent,
        title: 'ikas GraphQL Playground',
        content: PLAYGROUND_INFO,
        description: 'Interactive GraphQL API explorer for ikas',
        sections: [
          {
            id: 'what-is-playground',
            title: 'What is the GraphQL Playground?',
            level: 2,
            content: 'The GraphQL Playground provides interactive schema exploration, query/mutation builder, real-time API testing, and schema documentation.'
          },
          {
            id: 'accessing-schema',
            title: 'Accessing the Schema',
            level: 2,
            content: 'Use the API documentation pages or MCP tools to explore the schema.'
          },
          {
            id: 'graphql-endpoint',
            title: 'GraphQL Endpoint',
            level: 2,
            content: 'POST https://api.myikas.com/api/v1/admin/graphql'
          }
        ],
        apiEndpoints: [
          {
            method: 'POST',
            url: 'https://api.myikas.com/api/v1/admin/graphql',
            description: 'Main GraphQL API endpoint'
          }
        ]
      };
    }
    
    // Generate hash for change detection
    const hash = createHash('sha256')
      .update(extractedContent.content)
      .digest('hex');

    return {
      url,
      title: extractedContent.title,
      content: extractedContent.content,
      html,
      timestamp: new Date().toISOString(),
      hash,
      extractedContent
    };
  }

  extractGraphQLSchemas(html: string): string[] {
    const $ = cheerio.load(html);
    const schemas: string[] = [];

    // Find code blocks that might contain GraphQL
    $('pre code, .language-graphql, .language-gql').each((_, element) => {
      const code = $(element).text().trim();
      if (this.isGraphQLSchema(code)) {
        schemas.push(code);
      }
    });

    // Also check for inline GraphQL
    $('code').each((_, element) => {
      const code = $(element).text().trim();
      if (code.length > 50 && this.isGraphQLSchema(code)) {
        schemas.push(code);
      }
    });

    return schemas;
  }

  private isGraphQLSchema(code: string): boolean {
    const graphqlKeywords = [
      'type ',
      'input ',
      'enum ',
      'interface ',
      'query ',
      'mutation ',
      'fragment ',
      'scalar '
    ];

    return graphqlKeywords.some(keyword => 
      code.toLowerCase().includes(keyword) && 
      code.includes('{') && 
      code.includes('}')
    );
  }
}