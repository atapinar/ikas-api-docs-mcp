import { ScrapedPage } from '../types/index.js';
import { ExtractedContent } from '../parser/content-extractor.js';

interface SearchDocument {
  id: string; // URL
  title: string;
  content: string;
  category?: string;
  type?: string; // graphql, api, guide, etc.
  keywords: string[];
  sections: string[];
  graphqlTypes?: string[];
  codeLanguages?: string[];
}

interface SearchResult {
  url: string;
  title: string;
  snippet: string;
  score: number;
  matches: {
    title: boolean;
    content: boolean;
    keywords: boolean;
    graphql: boolean;
  };
}

export class SearchIndex {
  private documents: Map<string, SearchDocument> = new Map();
  private keywords: Map<string, Set<string>> = new Map(); // keyword -> document IDs
  private graphqlTypes: Map<string, Set<string>> = new Map(); // type name -> document IDs

  /**
   * Add a page to the search index
   */
  addDocument(page: ScrapedPage): void {
    const doc = this.createSearchDocument(page);
    this.documents.set(doc.id, doc);

    // Index keywords
    for (const keyword of doc.keywords) {
      if (!this.keywords.has(keyword)) {
        this.keywords.set(keyword, new Set());
      }
      this.keywords.get(keyword)!.add(doc.id);
    }

    // Index GraphQL types
    if (doc.graphqlTypes) {
      for (const typeName of doc.graphqlTypes) {
        const normalized = typeName.toLowerCase();
        if (!this.graphqlTypes.has(normalized)) {
          this.graphqlTypes.set(normalized, new Set());
        }
        this.graphqlTypes.get(normalized)!.add(doc.id);
      }
    }
  }

  /**
   * Search the index
   */
  search(query: string, options: {
    limit?: number;
    category?: string;
    type?: string;
  } = {}): SearchResult[] {
    const { limit = 10, category, type } = options;
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);
    
    const results: SearchResult[] = [];
    
    // Search through all documents
    for (const [url, doc] of this.documents) {
      // Filter by category/type if specified
      if (category && doc.category !== category) continue;
      if (type && doc.type !== type) continue;

      let score = 0;
      const matches = {
        title: false,
        content: false,
        keywords: false,
        graphql: false
      };

      // Title matching (highest weight)
      const titleLower = doc.title.toLowerCase();
      for (const word of queryWords) {
        if (titleLower.includes(word)) {
          score += 20;
          matches.title = true;
        }
      }

      // Exact title match bonus
      if (titleLower === queryLower) {
        score += 50;
      }

      // Keyword matching
      for (const word of queryWords) {
        if (doc.keywords.some(k => k.includes(word))) {
          score += 10;
          matches.keywords = true;
        }
      }

      // GraphQL type matching
      if (doc.graphqlTypes) {
        for (const word of queryWords) {
          if (doc.graphqlTypes.some(t => t.toLowerCase().includes(word))) {
            score += 15;
            matches.graphql = true;
          }
        }
      }

      // Content matching (lower weight)
      const contentLower = doc.content.toLowerCase();
      for (const word of queryWords) {
        const occurrences = (contentLower.match(new RegExp(word, 'g')) || []).length;
        score += Math.min(occurrences * 2, 10); // Cap at 10 points per word
        if (occurrences > 0) {
          matches.content = true;
        }
      }

      // Section matching
      for (const section of doc.sections) {
        const sectionLower = section.toLowerCase();
        for (const word of queryWords) {
          if (sectionLower.includes(word)) {
            score += 5;
          }
        }
      }

      if (score > 0) {
        // Extract snippet
        const snippet = this.extractSnippet(doc.content, queryWords);
        
        results.push({
          url,
          title: doc.title,
          snippet,
          score,
          matches
        });
      }
    }

    // Sort by score
    results.sort((a, b) => b.score - a.score);

    return results.slice(0, limit);
  }

  /**
   * Find documents by GraphQL type
   */
  findByGraphQLType(typeName: string): SearchResult[] {
    const normalized = typeName.toLowerCase();
    const documentIds = this.graphqlTypes.get(normalized);
    
    if (!documentIds) {
      return [];
    }

    const results: SearchResult[] = [];
    
    for (const id of documentIds) {
      const doc = this.documents.get(id);
      if (doc) {
        results.push({
          url: id,
          title: doc.title,
          snippet: `Contains GraphQL type: ${typeName}`,
          score: 100,
          matches: {
            title: false,
            content: false,
            keywords: false,
            graphql: true
          }
        });
      }
    }

    return results;
  }

  /**
   * Get all indexed categories
   */
  getCategories(): Array<{ name: string; count: number }> {
    const categories = new Map<string, number>();
    
    for (const doc of this.documents.values()) {
      if (doc.category) {
        categories.set(doc.category, (categories.get(doc.category) || 0) + 1);
      }
    }

    return Array.from(categories.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Get index statistics
   */
  getStats(): {
    totalDocuments: number;
    totalKeywords: number;
    totalGraphQLTypes: number;
    categories: Array<{ name: string; count: number }>;
  } {
    return {
      totalDocuments: this.documents.size,
      totalKeywords: this.keywords.size,
      totalGraphQLTypes: this.graphqlTypes.size,
      categories: this.getCategories()
    };
  }

  /**
   * Clear the index
   */
  clear(): void {
    this.documents.clear();
    this.keywords.clear();
    this.graphqlTypes.clear();
  }

  /**
   * Create a search document from a scraped page
   */
  private createSearchDocument(page: ScrapedPage): SearchDocument {
    const url = page.url;
    const urlParts = url.split('/');
    const category = urlParts.length > 4 ? urlParts[4] : undefined;
    
    // Determine document type
    let type = 'general';
    if (url.includes('/api/')) type = 'api';
    else if (url.includes('/graphql')) type = 'graphql';
    else if (url.includes('/playground')) type = 'playground';
    else if (url.includes('/guides/')) type = 'guide';

    // Extract keywords from title and URL
    const keywords = this.extractKeywords(page.title + ' ' + url);
    
    // Extract sections
    const sections: string[] = [];
    let graphqlTypes: string[] | undefined;
    let codeLanguages: string[] | undefined;

    if (page.extractedContent) {
      const extracted = page.extractedContent as ExtractedContent;
      
      // Add section titles
      if (extracted.sections) {
        for (const section of extracted.sections) {
          sections.push(section.title);
        }
      }

      // Extract GraphQL type names
      if (extracted.graphqlSchemas && extracted.graphqlSchemas.length > 0) {
        graphqlTypes = extracted.graphqlSchemas
          .map(s => s.name)
          .filter((n): n is string => n !== undefined);
      }

      // Extract code languages
      if (extracted.codeExamples && extracted.codeExamples.length > 0) {
        const langs = new Set(extracted.codeExamples.map(e => e.language));
        codeLanguages = Array.from(langs);
      }
    }

    return {
      id: url,
      title: page.title,
      content: page.content,
      category,
      type,
      keywords,
      sections,
      graphqlTypes,
      codeLanguages
    };
  }

  /**
   * Extract keywords from text
   */
  private extractKeywords(text: string): string[] {
    // Simple keyword extraction
    const words = text.toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3);

    // Remove common words
    const stopWords = new Set([
      'this', 'that', 'with', 'from', 'have', 'been',
      'were', 'what', 'when', 'where', 'which', 'while',
      'about', 'after', 'before', 'between', 'into',
      'through', 'during', 'before', 'after', 'ikas'
    ]);

    const keywords = words.filter(w => !stopWords.has(w));
    
    // Deduplicate
    return Array.from(new Set(keywords));
  }

  /**
   * Extract a snippet around the first match
   */
  private extractSnippet(content: string, queryWords: string[], maxLength: number = 200): string {
    const contentLower = content.toLowerCase();
    let bestStart = 0;
    let bestScore = 0;

    // Find the best starting position
    for (let i = 0; i < content.length - maxLength; i += 50) {
      const window = contentLower.substring(i, i + maxLength);
      let score = 0;
      
      for (const word of queryWords) {
        if (window.includes(word)) {
          score += 1;
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestStart = i;
      }
    }

    // Extract snippet
    let snippet = content.substring(bestStart, bestStart + maxLength).trim();
    
    // Try to start at a word boundary
    if (bestStart > 0) {
      const wordStart = snippet.indexOf(' ');
      if (wordStart > 0 && wordStart < 20) {
        snippet = snippet.substring(wordStart + 1);
      }
      snippet = '...' + snippet;
    }

    // End at a word boundary
    if (bestStart + maxLength < content.length) {
      const lastSpace = snippet.lastIndexOf(' ');
      if (lastSpace > snippet.length - 20) {
        snippet = snippet.substring(0, lastSpace);
      }
      snippet += '...';
    }

    return snippet;
  }
}