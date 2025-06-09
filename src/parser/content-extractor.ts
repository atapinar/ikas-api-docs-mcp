import * as cheerio from 'cheerio';
import { GraphQLParser } from './graphql-parser.js';
import { GraphQLSchema, CodeExample } from '../types/index.js';

export interface ExtractedContent {
  title: string;
  description: string;
  content: string;
  sections: Section[];
  graphqlSchemas: GraphQLSchema[];
  codeExamples: CodeExample[];
  apiEndpoints: Array<{ method: string; url: string; description?: string }>;
  navigation: NavigationItem[];
  metadata: PageMetadata;
}

export interface Section {
  id: string;
  title: string;
  level: number;
  content: string;
  subsections?: Section[];
}

export interface NavigationItem {
  title: string;
  url: string;
  isActive?: boolean;
  children?: NavigationItem[];
}

export interface PageMetadata {
  lastModified?: string;
  category?: string;
  tags?: string[];
  relatedPages?: Array<{ title: string; url: string }>;
}

export class ContentExtractor {
  private graphqlParser: GraphQLParser;

  constructor() {
    this.graphqlParser = new GraphQLParser();
  }

  /**
   * Extract all structured content from a page
   */
  extract(html: string, url: string): ExtractedContent {
    const $ = cheerio.load(html);

    // Extract basic content
    const title = this.extractTitle($);
    const description = this.extractDescription($);
    const content = this.extractMainContent($);
    
    // Extract structured data
    const sections = this.extractSections($);
    const graphqlSchemas = this.graphqlParser.extractSchemas(html);
    const codeExamples = this.graphqlParser.extractCodeExamples(html);
    const apiEndpoints = this.graphqlParser.extractAPIEndpoints(html);
    const navigation = this.extractNavigation($);
    const metadata = this.extractMetadata($, url);

    return {
      title,
      description,
      content,
      sections,
      graphqlSchemas,
      codeExamples,
      apiEndpoints,
      navigation,
      metadata
    };
  }

  private extractTitle($: cheerio.CheerioAPI): string {
    // Try multiple selectors
    const selectors = [
      'h1',
      'title',
      '.page-title',
      '[class*="title"]',
      'header h1',
      'main h1'
    ];

    for (const selector of selectors) {
      const title = $(selector).first().text().trim();
      if (title && title.length > 0) {
        return title;
      }
    }

    return 'Untitled Page';
  }

  private extractDescription($: cheerio.CheerioAPI): string {
    // Look for meta description
    const metaDesc = $('meta[name="description"]').attr('content');
    if (metaDesc) return metaDesc;

    // Look for first paragraph after title
    const firstP = $('h1').first().nextAll('p').first().text().trim();
    if (firstP && firstP.length > 50) return firstP;

    // Look for any description-like content
    const descSelectors = [
      '.description',
      '.page-description',
      '[class*="description"]',
      '.intro',
      '.lead'
    ];

    for (const selector of descSelectors) {
      const desc = $(selector).first().text().trim();
      if (desc && desc.length > 50) {
        return desc.substring(0, 200) + '...';
      }
    }

    return '';
  }

  private extractMainContent($: cheerio.CheerioAPI): string {
    // Special handling for playground
    const playgroundSelectors = [
      '.graphiql-container',
      '.playground',
      '[class*="graphql"]',
      '[class*="GraphQL"]',
      '.schema-docs',
      '.doc-explorer'
    ];
    
    for (const selector of playgroundSelectors) {
      const $element = $(selector);
      if ($element.length > 0) {
        const content = $element.text().trim();
        if (content.length > 50) {
          console.error(`[Extractor] Found playground content with selector: ${selector}`);
          return content;
        }
      }
    }
    
    // Standard content selectors
    const contentSelectors = [
      'main',
      'article',
      '.docs-content',
      '.content',
      '[role="main"]',
      '.documentation',
      '#content'
    ];

    for (const selector of contentSelectors) {
      const $element = $(selector);
      if ($element.length > 0) {
        // Remove navigation, sidebars, etc.
        const $clone = $element.clone();
        $clone.find('nav, aside, .sidebar, .navigation').remove();
        
        const content = $clone.text().trim();
        if (content.length > 100) {
          return content;
        }
      }
    }

    // Fallback to body
    const $body = $('body').clone();
    $body.find('nav, header, footer, aside, script, style').remove();
    return $body.text().trim();
  }

  private extractSections($: cheerio.CheerioAPI): Section[] {
    const sections: Section[] = [];
    const headings = $('h1, h2, h3, h4, h5, h6');

    headings.each((_, element) => {
      const $heading = $(element);
      const tagName = element.tagName.toLowerCase();
      const level = parseInt(tagName.substring(1));
      const title = $heading.text().trim();
      
      if (!title) return;

      // Generate ID from title
      const id = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

      // Extract content until next heading of same or higher level
      let content = '';
      let $current = $heading.next();
      
      while ($current.length > 0) {
        const currentTag = $current[0].tagName.toLowerCase();
        
        // Stop if we hit another heading of same or higher level
        if (/^h[1-6]$/.test(currentTag)) {
          const currentLevel = parseInt(currentTag.substring(1));
          if (currentLevel <= level) break;
        }
        
        content += $current.text().trim() + '\n';
        $current = $current.next();
      }

      sections.push({
        id,
        title,
        level,
        content: content.trim()
      });
    });

    // Build hierarchy
    return this.buildSectionHierarchy(sections);
  }

  private buildSectionHierarchy(flatSections: Section[]): Section[] {
    const rootSections: Section[] = [];
    const stack: Section[] = [];

    for (const section of flatSections) {
      // Remove sections from stack that are same level or higher
      while (stack.length > 0 && stack[stack.length - 1].level >= section.level) {
        stack.pop();
      }

      if (stack.length === 0) {
        // Top level section
        rootSections.push(section);
      } else {
        // Subsection of the last item in stack
        const parent = stack[stack.length - 1];
        if (!parent.subsections) {
          parent.subsections = [];
        }
        parent.subsections.push(section);
      }

      stack.push(section);
    }

    return rootSections;
  }

  private extractNavigation($: cheerio.CheerioAPI): NavigationItem[] {
    const navItems: NavigationItem[] = [];
    
    // Common navigation selectors
    const navSelectors = [
      'nav a',
      '.navigation a',
      '.sidebar a',
      '.docs-nav a',
      '.menu a'
    ];

    for (const selector of navSelectors) {
      const links = $(selector);
      if (links.length > 0) {
        links.each((_, element) => {
          const $link = $(element);
          const href = $link.attr('href');
          const text = $link.text().trim();
          
          if (href && text && href.startsWith('/')) {
            navItems.push({
              title: text,
              url: `https://ikas.dev${href}`,
              isActive: $link.hasClass('active') || $link.attr('aria-current') === 'page'
            });
          }
        });
        break; // Use first navigation found
      }
    }

    return navItems;
  }

  private extractMetadata($: cheerio.CheerioAPI, url: string): PageMetadata {
    const metadata: PageMetadata = {};

    // Try to determine category from URL
    const urlParts = url.split('/');
    if (urlParts.length > 4) {
      metadata.category = urlParts[4]; // e.g., 'api', 'guides', etc.
    }

    // Look for tags
    const tagSelectors = ['.tag', '.label', '[class*="tag"]'];
    const tags: string[] = [];
    
    for (const selector of tagSelectors) {
      $(selector).each((_, element) => {
        const tag = $(element).text().trim();
        if (tag && tag.length < 50) {
          tags.push(tag);
        }
      });
    }
    
    if (tags.length > 0) {
      metadata.tags = [...new Set(tags)]; // Deduplicate
    }

    // Look for related pages
    const relatedSelectors = [
      '.related a',
      '.see-also a',
      '[class*="related"] a'
    ];
    
    const relatedPages: Array<{ title: string; url: string }> = [];
    
    for (const selector of relatedSelectors) {
      $(selector).each((_, element) => {
        const $link = $(element);
        const href = $link.attr('href');
        const title = $link.text().trim();
        
        if (href && title) {
          const fullUrl = href.startsWith('http') ? href : `https://ikas.dev${href}`;
          relatedPages.push({ title, url: fullUrl });
        }
      });
    }
    
    if (relatedPages.length > 0) {
      metadata.relatedPages = relatedPages;
    }

    return metadata;
  }
}