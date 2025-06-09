import { IkasScraper } from './scraper/core.js';
import { FileCache } from './cache/file-cache.js';

async function testCacheWithScraper() {
  const scraper = new IkasScraper();
  const cache = new FileCache('./cache');
  
  try {
    await scraper.initialize();
    await cache.initialize();
    
    const testUrl = 'https://ikas.dev/docs/api/admin-api/products';
    
    // Check if page is already cached
    const cachedEntry = await cache.get(testUrl);
    
    if (cachedEntry) {
      console.log('\n--- Using Cached Data ---');
      console.log(`Title: ${cachedEntry.page.title}`);
      console.log(`Cached at: ${cachedEntry.lastModified}`);
      console.log(`Content preview: ${cachedEntry.page.content.substring(0, 200)}...`);
    } else {
      console.log('\n--- Scraping Fresh Data ---');
      const result = await scraper.scrapePage(testUrl);
      
      // Save to cache
      await cache.set(testUrl, result);
      
      console.log(`Title: ${result.title}`);
      console.log(`Scraped and cached successfully!`);
    }
    
    // Show cache stats
    const stats = await cache.getStats();
    console.log('\n--- Cache Statistics ---');
    console.log(`Total entries: ${stats.totalEntries}`);
    console.log(`Total size: ${(stats.totalSize / 1024).toFixed(2)} KB`);
    console.log(`Oldest entry: ${stats.oldestEntry}`);
    console.log(`Newest entry: ${stats.newestEntry}`);
    
    // List all cached URLs
    const urls = await cache.list();
    console.log('\n--- Cached URLs ---');
    urls.forEach(url => console.log(`- ${url}`));
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await scraper.close();
  }
}

testCacheWithScraper();