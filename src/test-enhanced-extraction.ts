import { IkasScraper } from './scraper/core.js';
import { FileCache } from './cache/file-cache.js';

async function testEnhancedExtraction() {
  const scraper = new IkasScraper();
  const cache = new FileCache('./cache');
  
  try {
    await scraper.initialize();
    await cache.initialize();
    
    // Test with a GraphQL documentation page
    const testUrl = 'https://ikas.dev/docs/api/admin-api/products';
    
    console.log(`\n🔍 Testing enhanced extraction on: ${testUrl}\n`);
    
    // Clear cache for fresh test
    await cache.delete(testUrl);
    
    // Scrape the page
    const result = await scraper.scrapePage(testUrl);
    
    // Save to cache
    await cache.set(testUrl, result);
    
    // Display extracted content
    if (result.extractedContent) {
      const extracted = result.extractedContent;
      
      console.log('📄 BASIC INFO:');
      console.log(`   Title: ${extracted.title}`);
      console.log(`   Description: ${extracted.description || 'No description'}`);
      console.log(`   Content length: ${extracted.content.length} chars`);
      
      console.log('\n📑 SECTIONS:');
      extracted.sections.forEach((section: any) => {
        console.log(`   ${' '.repeat((section.level - 1) * 2)}• ${section.title}`);
      });
      
      console.log('\n💎 GRAPHQL SCHEMAS:');
      if (extracted.graphqlSchemas.length > 0) {
        extracted.graphqlSchemas.forEach((schema: any, i: number) => {
          console.log(`   ${i + 1}. ${schema.type} ${schema.name}`);
          if (schema.fields) {
            console.log(`      Fields: ${schema.fields.length}`);
            schema.fields.slice(0, 3).forEach((field: any) => {
              console.log(`      - ${field.name}: ${field.type}`);
            });
            if (schema.fields.length > 3) {
              console.log(`      ... and ${schema.fields.length - 3} more`);
            }
          }
        });
      } else {
        console.log('   No GraphQL schemas found');
      }
      
      console.log('\n📝 CODE EXAMPLES:');
      if (extracted.codeExamples.length > 0) {
        extracted.codeExamples.forEach((example: any, i: number) => {
          console.log(`   ${i + 1}. [${example.language}] ${example.title || 'Code example'}`);
          console.log(`      Length: ${example.code.length} chars`);
        });
      } else {
        console.log('   No code examples found');
      }
      
      console.log('\n🔗 API ENDPOINTS:');
      if (extracted.apiEndpoints.length > 0) {
        extracted.apiEndpoints.forEach((endpoint: any) => {
          console.log(`   ${endpoint.method} ${endpoint.url}`);
        });
      } else {
        console.log('   No API endpoints found');
      }
      
      console.log('\n🧭 NAVIGATION:');
      if (extracted.navigation.length > 0) {
        console.log(`   Found ${extracted.navigation.length} navigation links`);
        extracted.navigation.slice(0, 5).forEach((nav: any) => {
          console.log(`   - ${nav.title}${nav.isActive ? ' (active)' : ''}`);
        });
        if (extracted.navigation.length > 5) {
          console.log(`   ... and ${extracted.navigation.length - 5} more`);
        }
      }
      
      console.log('\n📊 METADATA:');
      console.log(`   Category: ${extracted.metadata.category || 'Unknown'}`);
      if (extracted.metadata.tags) {
        console.log(`   Tags: ${extracted.metadata.tags.join(', ')}`);
      }
      if (extracted.metadata.relatedPages) {
        console.log(`   Related pages: ${extracted.metadata.relatedPages.length}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await scraper.close();
  }
}

testEnhancedExtraction();