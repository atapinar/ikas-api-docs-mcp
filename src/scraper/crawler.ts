import { IkasScraper } from './core.js';
import { FileCache } from '../cache/file-cache.js';
import * as cheerio from 'cheerio';
import { URL } from 'url';

export interface CrawlOptions {
  maxDepth?: number;
  maxPages?: number;
  respectRobotsTxt?: boolean;
  delayMs?: number;
  includePatterns?: RegExp[];
  excludePatterns?: RegExp[];
}

export interface CrawlResult {
  urlsDiscovered: string[];
  urlsCrawled: string[];
  urlsFailed: string[];
  startTime: Date;
  endTime: Date;
  duration: number;
}

export class SmartCrawler {
  private scraper: IkasScraper;
  private cache: FileCache;
  private visited: Set<string> = new Set();
  private queue: Array<{ url: string; depth: number }> = [];
  private failed: Set<string> = new Set();
  private baseUrl = 'https://ikas.dev';
  
  constructor(scraper: IkasScraper, cache: FileCache) {
    this.scraper = scraper;
    this.cache = cache;
  }

  /**
   * Crawl the ikas documentation site
   */
  async crawl(options: CrawlOptions = {}): Promise<CrawlResult> {
    const {
      maxDepth = 10,
      maxPages = 500,
      // respectRobotsTxt = true, // TODO: Implement robots.txt checking
      delayMs = 1000,
      includePatterns = [/\/docs\//, /\/playground/],
      excludePatterns = [/\.(pdf|zip|png|jpg|jpeg|gif)$/i]
    } = options;

    const startTime = new Date();
    console.error('[Crawler] Starting crawl...');

    // Reset state
    this.visited.clear();
    this.queue = [];
    this.failed.clear();

    // Start with known entry points
    const seedUrls = [
      'https://ikas.dev/docs/intro',
      'https://ikas.dev/docs/api/admin-api/products',
      'https://ikas.dev/docs/api/admin-api/orders',
      'https://ikas.dev/docs/api/admin-api/customers',
      'https://ikas.dev/playground'
    ];

    // Add seed URLs to queue
    for (const url of seedUrls) {
      this.queue.push({ url, depth: 0 });
    }

    // Also try to fetch sitemap
    const sitemapUrls = await this.fetchSitemap();
    for (const url of sitemapUrls) {
      if (this.shouldCrawl(url, includePatterns, excludePatterns)) {
        this.queue.push({ url, depth: 0 });
      }
    }

    // Main crawl loop
    while (this.queue.length > 0 && this.visited.size < maxPages) {
      const { url, depth } = this.queue.shift()!;

      if (this.visited.has(url) || depth > maxDepth) {
        continue;
      }

      try {
        console.error(`[Crawler] Crawling (depth ${depth}): ${url}`);
        this.visited.add(url);

        // Check if already cached
        const cached = await this.cache.has(url);
        if (!cached) {
          // Scrape the page
          const page = await this.scraper.scrapePage(url);
          await this.cache.set(url, page);
          
          // Extract links from the page
          const links = this.extractLinks(page.html, url);
          
          // Add valid links to queue
          for (const link of links) {
            if (this.shouldCrawl(link, includePatterns, excludePatterns) && !this.visited.has(link)) {
              this.queue.push({ url: link, depth: depth + 1 });
            }
          }

          // Respect rate limiting
          if (delayMs > 0) {
            await this.delay(delayMs);
          }
        } else {
          console.error(`[Crawler] Already cached: ${url}`);
          
          // Still extract links from cached content
          const entry = await this.cache.get(url);
          if (entry) {
            const links = this.extractLinks(entry.page.html, url);
            for (const link of links) {
              if (this.shouldCrawl(link, includePatterns, excludePatterns) && !this.visited.has(link)) {
                this.queue.push({ url: link, depth: depth + 1 });
              }
            }
          }
        }
      } catch (error) {
        console.error(`[Crawler] Failed to crawl ${url}:`, error);
        this.failed.add(url);
      }
    }

    const endTime = new Date();
    const duration = endTime.getTime() - startTime.getTime();

    const result: CrawlResult = {
      urlsDiscovered: Array.from(this.visited),
      urlsCrawled: Array.from(this.visited).filter(url => !this.failed.has(url)),
      urlsFailed: Array.from(this.failed),
      startTime,
      endTime,
      duration
    };

    console.error(`[Crawler] Crawl complete!`);
    console.error(`[Crawler] Discovered: ${result.urlsDiscovered.length} URLs`);
    console.error(`[Crawler] Crawled: ${result.urlsCrawled.length} pages`);
    console.error(`[Crawler] Failed: ${result.urlsFailed.length} pages`);
    console.error(`[Crawler] Duration: ${(duration / 1000).toFixed(2)}s`);

    return result;
  }

  /**
   * Try to fetch sitemap.xml
   */
  private async fetchSitemap(): Promise<string[]> {
    const urls: string[] = [];
    
    try {
      console.error('[Crawler] Checking for sitemap...');
      const sitemapUrl = `${this.baseUrl}/sitemap.xml`;
      const page = await this.scraper.scrapePage(sitemapUrl);
      
      const $ = cheerio.load(page.html, { xmlMode: true });
      $('url loc').each((_, element) => {
        const url = $(element).text().trim();
        // Only include ikas.dev URLs, not ikas.com
        if (url && url.startsWith('https://ikas.dev/')) {
          urls.push(url);
        }
      });
      
      console.error(`[Crawler] Found ${urls.length} URLs in sitemap`);
    } catch (error) {
      console.error('[Crawler] No sitemap found or error parsing it');
    }

    return urls;
  }

  /**
   * Extract all links from HTML
   */
  private extractLinks(html: string, baseUrl: string): string[] {
    const $ = cheerio.load(html);
    const links: Set<string> = new Set();
    const base = new URL(baseUrl);

    $('a[href]').each((_, element) => {
      const href = $(element).attr('href');
      if (!href) return;

      try {
        let absoluteUrl: string;
        
        if (href.startsWith('http://') || href.startsWith('https://')) {
          absoluteUrl = href;
        } else if (href.startsWith('//')) {
          absoluteUrl = base.protocol + href;
        } else if (href.startsWith('/')) {
          absoluteUrl = base.origin + href;
        } else if (href.startsWith('#')) {
          // Skip anchor links
          return;
        } else {
          // Relative URL
          absoluteUrl = new URL(href, baseUrl).toString();
        }

        // Clean URL (remove fragments and normalize)
        const url = new URL(absoluteUrl);
        url.hash = '';
        const cleanUrl = url.toString();

        // Only include ikas.dev URLs
        if (cleanUrl.startsWith(this.baseUrl)) {
          links.add(cleanUrl);
        }
      } catch (error) {
        // Invalid URL, skip
      }
    });

    return Array.from(links);
  }

  /**
   * Check if URL should be crawled
   */
  private shouldCrawl(url: string, includePatterns: RegExp[], excludePatterns: RegExp[]): boolean {
    // Check exclude patterns first
    for (const pattern of excludePatterns) {
      if (pattern.test(url)) {
        return false;
      }
    }

    // Check include patterns
    if (includePatterns.length === 0) {
      return true;
    }

    for (const pattern of includePatterns) {
      if (pattern.test(url)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get crawl statistics
   */
  async getCrawlStats(): Promise<{
    totalUrls: number;
    cachedUrls: number;
    categories: Map<string, number>;
    lastCrawl?: Date;
  }> {
    const urls = await this.cache.list();
    const categories = new Map<string, number>();

    for (const url of urls) {
      const parts = url.split('/');
      if (parts.length > 4) {
        const category = parts[4];
        categories.set(category, (categories.get(category) || 0) + 1);
      }
    }

    return {
      totalUrls: urls.length,
      cachedUrls: urls.length,
      categories,
      lastCrawl: urls.length > 0 ? new Date() : undefined
    };
  }
}