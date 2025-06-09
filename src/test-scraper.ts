import { IkasScraper } from './scraper/core.js';

async function testScraper() {
  const scraper = new IkasScraper();
  
  try {
    await scraper.initialize();
    
    // Test scraping the products API page
    const testUrl = 'https://ikas.dev/docs/api/admin-api/products';
    console.log(`Testing scraper with: ${testUrl}`);
    
    const result = await scraper.scrapePage(testUrl);
    
    console.log('\n--- Scraping Result ---');
    console.log(`URL: ${result.url}`);
    console.log(`Title: ${result.title}`);
    console.log(`Content length: ${result.content.length} characters`);
    console.log(`HTML length: ${result.html.length} characters`);
    console.log(`Hash: ${result.hash}`);
    console.log(`Timestamp: ${result.timestamp}`);
    
    // Extract GraphQL schemas
    const schemas = scraper.extractGraphQLSchemas(result.html);
    console.log(`\nFound ${schemas.length} GraphQL schemas`);
    
    if (schemas.length > 0) {
      console.log('\nFirst schema preview:');
      console.log(schemas[0].substring(0, 200) + '...');
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await scraper.close();
  }
}

testScraper();