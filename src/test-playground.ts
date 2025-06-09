import { IkasScraper } from './scraper/core.js';
import { FileCache } from './cache/file-cache.js';

async function testPlayground() {
  const scraper = new IkasScraper();
  const cache = new FileCache('./cache');
  
  try {
    await scraper.initialize();
    await cache.initialize();
    
    const url = 'https://ikas.dev/playground';
    console.log(`\n🔍 Testing playground extraction: ${url}\n`);
    
    // Clear cache for fresh test
    await cache.delete(url);
    
    // Scrape the page
    const result = await scraper.scrapePage(url);
    
    console.log('📄 SCRAPED CONTENT:');
    console.log(`Title: ${result.title}`);
    console.log(`Content length: ${result.content.length} chars`);
    console.log(`HTML length: ${result.html.length} chars`);
    
    if (result.extractedContent) {
      const extracted = result.extractedContent;
      console.log('\n🔍 EXTRACTED DATA:');
      console.log(`Sections: ${extracted.sections.length}`);
      console.log(`GraphQL Schemas: ${extracted.graphqlSchemas.length}`);
      console.log(`Code Examples: ${extracted.codeExamples.length}`);
      console.log(`API Endpoints: ${extracted.apiEndpoints.length}`);
      console.log(`Navigation Links: ${extracted.navigation.length}`);
    }
    
    // Check what's in the HTML
    console.log('\n📝 HTML PREVIEW:');
    console.log(result.html.substring(0, 500) + '...');
    
    // Look for GraphQL content
    const hasGraphQL = result.html.includes('graphql') || result.html.includes('GraphQL');
    const hasSchema = result.html.includes('schema') || result.html.includes('Schema');
    const hasQuery = result.html.includes('query') || result.html.includes('Query');
    
    console.log('\n🔎 CONTENT CHECKS:');
    console.log(`Contains 'graphql': ${hasGraphQL}`);
    console.log(`Contains 'schema': ${hasSchema}`);
    console.log(`Contains 'query': ${hasQuery}`);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await scraper.close();
  }
}

testPlayground();