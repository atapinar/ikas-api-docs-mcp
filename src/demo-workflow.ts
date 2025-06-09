import { IkasScraper } from './scraper/core.js';
import { FileCache } from './cache/file-cache.js';
import { SmartCrawler } from './scraper/crawler.js';
import { SearchIndex } from './search/search-index.js';

async function demonstrateWorkflow() {
  const scraper = new IkasScraper();
  const cache = new FileCache('./cache');
  const crawler = new SmartCrawler(scraper, cache);
  const searchIndex = new SearchIndex();
  
  try {
    await scraper.initialize();
    await cache.initialize();
    
    console.log('🚀 Starting ikas Documentation MCP Server Demo\n');
    
    // Step 1: Show current cache status
    console.log('📊 Step 1: Checking current cache status...');
    const initialStats = await cache.getStats();
    console.log(`   - Cached pages: ${initialStats.totalEntries}`);
    console.log(`   - Cache size: ${(initialStats.totalSize / 1024).toFixed(2)} KB\n`);
    
    // Step 2: Crawl documentation (limited for demo)
    console.log('🕷️  Step 2: Crawling ikas documentation...');
    console.log('   (This will take a few minutes)\n');
    
    const crawlResult = await crawler.crawl({
      maxPages: 20,  // Limited for demo
      delayMs: 500   // Faster for demo
    });
    
    console.log(`   ✅ Crawl complete!`);
    console.log(`   - Pages discovered: ${crawlResult.urlsDiscovered.length}`);
    console.log(`   - Pages crawled: ${crawlResult.urlsCrawled.length}`);
    console.log(`   - Failed: ${crawlResult.urlsFailed.length}\n`);
    
    // Step 3: Build search index
    console.log('🔍 Step 3: Building search index...');
    const urls = await cache.list();
    for (const url of urls) {
      const entry = await cache.get(url);
      if (entry) {
        searchIndex.addDocument(entry.page);
      }
    }
    const indexStats = searchIndex.getStats();
    console.log(`   ✅ Index built!`);
    console.log(`   - Documents: ${indexStats.totalDocuments}`);
    console.log(`   - Keywords: ${indexStats.totalKeywords}`);
    console.log(`   - GraphQL types: ${indexStats.totalGraphQLTypes}\n`);
    
    // Step 4: Demonstrate searches
    console.log('🔎 Step 4: Demonstrating search capabilities...\n');
    
    // Search for products
    console.log('   📌 Searching for "product"...');
    const productResults = searchIndex.search('product', { limit: 3 });
    productResults.forEach((result, i) => {
      console.log(`      ${i + 1}. ${result.title} (score: ${result.score})`);
      console.log(`         ${result.url}`);
    });
    
    console.log('\n   📌 Searching for GraphQL mutations...');
    const mutationResults = searchIndex.search('mutation save', { limit: 3 });
    mutationResults.forEach((result, i) => {
      console.log(`      ${i + 1}. ${result.title} (score: ${result.score})`);
    });
    
    // Step 5: Show categories
    console.log('\n📁 Step 5: Documentation categories found:');
    const categories = indexStats.categories;
    categories.forEach(cat => {
      console.log(`   - ${cat.name}: ${cat.count} pages`);
    });
    
    // Step 6: Find specific GraphQL types
    console.log('\n💎 Step 6: Looking for GraphQL types...');
    const graphqlPages = urls.filter(url => url.includes('/api/'));
    let typesFound = 0;
    
    for (const url of graphqlPages.slice(0, 5)) {
      const entry = await cache.get(url);
      if (entry?.page.extractedContent) {
        const schemas = (entry.page.extractedContent as any).graphqlSchemas;
        if (schemas && schemas.length > 0) {
          console.log(`   📄 ${url.split('/').pop()}:`);
          schemas.slice(0, 3).forEach((schema: any) => {
            console.log(`      - ${schema.type} ${schema.name}`);
            typesFound++;
          });
        }
      }
    }
    console.log(`   Total GraphQL types found: ${typesFound}+`);
    
    console.log('\n✨ Demo complete! The MCP server is now ready with:');
    console.log('   - Cached documentation pages');
    console.log('   - Full-text search index');
    console.log('   - GraphQL schema extraction');
    console.log('   - Smart content parsing\n');
    
    console.log('💡 You can now use the MCP tools to:');
    console.log('   - search_docs: Search through all documentation');
    console.log('   - find_graphql_type: Find specific GraphQL types');
    console.log('   - find_mutation: Find mutations for operations');
    console.log('   - find_code_example: Find code examples');
    console.log('   - And more!\n');
    
  } catch (error) {
    console.error('❌ Demo failed:', error);
  } finally {
    await scraper.close();
  }
}

// Run the demo
console.log('Starting demo workflow...\n');
demonstrateWorkflow();