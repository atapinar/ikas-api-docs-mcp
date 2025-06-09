export interface ScrapedPage {
  url: string;
  title: string;
  content: string;
  html: string;
  timestamp: string;
  hash: string;
  extractedContent?: any; // Will be ExtractedContent from content-extractor
}

export interface CacheEntry {
  page: ScrapedPage;
  lastModified: string;
  etag?: string;
}

export interface GraphQLSchema {
  raw: string;
  parsed?: any;
  type: 'query' | 'mutation' | 'type' | 'input' | 'enum' | 'interface';
  name: string;
  fields?: Array<{
    name: string;
    type: string;
    description?: string;
  }>;
}

export interface CodeExample {
  language: string;
  code: string;
  title?: string;
  description?: string;
}