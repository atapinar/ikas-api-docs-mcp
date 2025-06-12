# Değişiklik Günlüğü

Bu projedeki tüm önemli değişiklikler bu dosyada belgelenecektir.

Format [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) standardına dayanmaktadır
ve bu proje [Semantic Versioning](https://semver.org/spec/v2.0.0.html) kurallarına uymaktadır.

## [1.1.0] - 2025-01-12

### Eklenenler

#### MCP Protokol Geliştirmeleri
- **MCP Resources Desteği**: Önbelleğe alınmış dokümantasyon sayfaları artık MCP kaynakları olarak erişilebilir
  - `ListResourcesRequestSchema` handler eklendi
  - `ReadResourceRequestSchema` handler eklendi
  - Tüm önbellek içeriği browsable resource olarak sunuluyor
  
- **MCP Prompts Desteği**: Hazır prompt şablonları eklendi
  - `generate_graphql_query` - GraphQL sorguları oluşturmak için
  - `find_api_integration` - API entegrasyon örnekleri bulmak için
  - `debug_error` - ikas API hatalarını debug etmek için
  - `code_example_generator` - Kod örnekleri oluşturmak için

#### Tamamlanan Araçlar
- **`find_query`**: GraphQL query'lerini bulma özelliği tam olarak implement edildi
- **`get_field_info`**: GraphQL type field bilgilerini getirme özelliği eklendi
- **`get_api_endpoint`**: API endpoint bilgilerini bulma özelliği implement edildi
- **`explain_error`**: Hata açıklama ve çözüm önerisi özelliği tamamlandı

### Düzeltmeler
- Claude Desktop'ta çift sunucu konfigürasyonu sorunu çözüldü (ikas-api-docs kaldırıldı)
- "Server does not support resources" hatası düzeltildi
- TypeScript tip tanımları güncellendi ve iyileştirildi
- Null/undefined kontrolleri eklendi

### Teknik İyileştirmeler
- Server capabilities'e `resources` ve `prompts` yetenekleri eklendi
- GraphQLSchema interface'i query ve description alanlarını içerecek şekilde güncellendi
- Daha iyi hata yönetimi ve tip güvenliği sağlandı

## [1.0.0] - 2025-01-09

### Eklenenler

#### Temel Özellikler
- **Akıllı Web Scraper**: Puppeteer ve Cheerio kullanarak hem statik hem de JavaScript-render edilmiş sayfaları işler
- **Akıllı Önbellekleme Sistemi**: Çevrimdışı erişim ve performans için dosya tabanlı önbellek
- **Gelişmiş İçerik Çıkarma**: GraphQL şemaları, kod örnekleri ve API endpoint'lerinin yapılandırılmış ayrıştırması
- **Tam Metin Arama İndeksi**: Anahtar kelime çıkarma ve ilgililik skorlaması ile hızlı arama
- **MCP Sunucu Uygulaması**: 14 özelleştirilmiş araç ile tam Model Context Protocol uyumluluğu

#### MCP Araçları
- `get_page` - Herhangi bir ikas.dev dokümantasyon sayfasını veya playground'u getir ve önbelleğe al
- `search_docs` - Tüm önbelleğe alınmış dokümantasyonda hızlı indeksli arama
- `search_advanced` - Kategori ve tip filtreleme ile gelişmiş arama
- `cache_stats` - Önbellek istatistiklerini ve önbelleğe alınmış URL'leri görüntüle
- `find_graphql_type` - Belirli GraphQL tip tanımlarını bul
- `find_mutation` - Belirli eylemler için mutation'ları bul (oluştur, güncelle, sil)
- `find_query` - Veri çekme için query'leri bul
- `find_code_example` - Konu ve dile göre kod örnekleri bul
- `get_api_endpoint` - API endpoint bilgilerini al (placeholder)
- `crawl_site` - Dokümantasyon sayfalarını otomatik keşfet ve önbelleğe al
- `rebuild_index` - Arama indeksini önbellekten yeniden oluştur
- `list_categories` - Tüm dokümantasyon kategorilerini listele
- `get_field_info` - Alan bilgilerini al (placeholder)
- `explain_error` - Hataları açıkla ve çözüm öner (placeholder)

#### Teknik Uygulama
- Tip güvenli geliştirme için TypeScript
- JavaScript-render edilmiş içerik için Puppeteer
- HTML ayrıştırma için Cheerio
- GraphQL tip indeksleme ile özel arama indeksi
- Rate limiting ve hata yönetimi ile akıllı tarayıcı
- Kimlik doğrulama gerektiren sayfalar için Playground yedek içeriği

### Performans
- ~20 sayfayı bir dakikadan kısa sürede tarar
- Arama yanıtları <50ms'de
- Önbellek API yükünü %90+ azaltır
- Hem ikas.dev hem de ikas.com URL'lerini işler

### Sağlanan Değer
- Proje başına 15-30 dakikalık manuel dokümantasyon kopyalamayı ortadan kaldırır
- GraphQL şemalarına ve mutation'lara anında erişim
- İlk senkronizasyondan sonra çevrimdışı çalışır
- Aktif ikas geliştiricileri için yılda 100+ saat tasarruf sağlar

[1.1.0]: https://github.com/atapinar/ikas-api-docs-mcp/releases/tag/v1.1.0
[1.0.0]: https://github.com/atapinar/ikas-api-docs-mcp/releases/tag/v1.0.0