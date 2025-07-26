# ikas api docs mcp

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/atapinar/ikas-api-docs-mcp/releases/tag/v1.0.0)
[![MCP](https://img.shields.io/badge/MCP-Compatible-green.svg)](https://modelcontextprotocol.io)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)

🇹🇷 Türkçe | [🇬🇧 English](./README-EN.md)

ikas.dev dokümantasyonunu LLM'lere sunan MCP sunucusu. Model Context Protocol aracılığıyla ikas API dokümantasyonuna, GraphQL şemalarına ve kod örneklerine anında erişim sağlar.

## ⚠️ Önemli Uyarı

Bu, **bağımsız olarak geliştirilmiş** bir MCP sunucusudur ve bireysel bir geliştirici tarafından oluşturulmuştur. **ikas ile herhangi bir bağlantım yoktur** ve ikas'ta çalışmıyorum. Bu araç, geliştirici topluluğu için olduğu gibi sunulmaktadır. Bu MCP sunucusuyla ilgili teknik sorunlar için lütfen bu repository'de issue açın - ikas destek ekibiyle iletişime geçmeyin çünkü bu araçtan sorumlu değiller.

## Yıldız Geçmişi

[![Star History Chart](https://api.star-history.com/svg?repos=atapinar/ikas-api-docs-mcp&type=Date)](https://star-history.com/#atapinar/ikas-api-docs-mcp&Date)

## Kurulum

```bash
# Repository'yi klonlayın
git clone https://github.com/atapinar/ikas-api-docs-mcp.git
cd ikas-api-docs-mcp

# Bağımlılıkları yükleyin
npm install

# Projeyi derleyin
npm run build

# İlk taramayı yapın (opsiyonel ama tavsiye edilir)
node build/demo-workflow.js
```

## Faz 1 Tamamlandı ✓

Başarıyla tamamlanan özellikler:
- ✓ TypeScript ve tüm bağımlılıklarla proje kurulumu
- ✓ Hem statik hem de JS-render edilmiş sayfaları destekleyen temel scraper
- ✓ Tam CRUD işlemli dosya tabanlı önbellek sistemi
- ✓ Temel araçlarla minimal MCP sunucusu

## Faz 2 Tamamlandı ✓

Gelişmiş içerik çıkarma ve MCP araçları:
- ✓ Yapılandırılmış veriyle akıllı içerik çıkarma
- ✓ GraphQL şema ayrıştırma ve analizi
- ✓ Kod örneği çıkarma
- ✓ API endpoint keşfi
- ✓ 11 özelleştirilmiş MCP aracı

## Faz 3 Tamamlandı ✓

Arama ve Keşif:
- ✓ Dokümantasyon sayfalarını otomatik keşfeden akıllı tarayıcı
- ✓ Anahtar kelime çıkarmalı tam metin arama indeksi
- ✓ Hızlı aramalar için GraphQL tip indeksleme
- ✓ Kategori ve tip filtrelemeli gelişmiş arama
- ✓ Taramalardan sonra otomatik indeks yenileme
- ✓ Toplam 14 MCP aracı:
  - `crawl_site`: Dokümantasyon sayfalarını keşfet ve önbelleğe al
  - `rebuild_index`: Arama indeksini yeniden oluştur
  - `search_advanced`: Filtreli gelişmiş arama

## Hızlı Başlangıç

### Claude Desktop ile

1. Claude Desktop config dosyanıza ekleyin (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "ikas-docs-scraper": {
      "command": "node",
      "args": ["/path/to/ikas-docs-scraper-mcp/build/index.js"],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

2. Claude Desktop'ı yeniden başlatın

3. Sohbetlerinizde araçları kullanın!

### MCP Inspector ile

```bash
# Yerel test
npm run mcp:test

# Veya özel portlarla
npm run mcp:test:alt
```

## MCP Sunucusunu Test Edin

1. MCP Inspector kullanarak:
```bash
npx @modelcontextprotocol/inspector node build/index.js
```

2. Claude Desktop'ı yapılandırın:
`claude_desktop_config.json` içeriğini Claude Desktop yapılandırmanıza kopyalayın.

## Mevcut Araçlar

### Temel Araçlar
- **get_page**: Herhangi bir ikas dokümantasyon sayfasını veya playground'u gelişmiş çıkarmayla getirir
- **search_docs**: Tüm önbelleğe alınmış sayfalarda hızlı indeksli arama
- **search_advanced**: Kategori/tip filtreleriyle arama
- **cache_stats**: Önbellek istatistiklerini ve URL'lerini gösterir

### GraphQL Araçları
- **find_graphql_type**: Tip tanımlarını bulur (Product, Order, vb.)
- **find_mutation**: Mutation'ları bulur (ürün oluştur, sipariş güncelle, vb.)
- **find_query**: Veri çekme için query'leri bulur
- **find_code_example**: Konuya ve dile göre kod örnekleri bulur

### Keşif Araçları
- **crawl_site**: Dokümantasyon sayfalarını otomatik keşfet ve önbelleğe al
- **rebuild_index**: Arama indeksini yeniden oluştur
- **list_categories**: Tüm dokümantasyon kategorilerini listeler

### Yakında
- **get_field_info**: Detaylı alan bilgisi al
- **get_api_endpoint**: API endpoint bilgisi al
- **explain_error**: Hataları çözümleriyle açıkla

## Kullanım Örnekleri

### İlk Kurulum

1. **Dokümantasyonu tarayın** (yerel önbelleğinizi oluşturur):
```json
crawl_site { "maxPages": 50 }
```

2. **Belirli konuları arayın**:
```json
search_docs { "query": "ürün varyantları" }
```

3. **GraphQL tiplerini bulun**:
```json
find_graphql_type { "typeName": "Product" }
```

4. **Mutation'ları bulun**:
```json
find_mutation { "action": "create", "entity": "product" }
```

5. **Belirli dokümantasyonu alın**:
```json
get_page { "url": "https://ikas.dev/docs/api/admin-api/products" }
```

## Geliştirme

```bash
# Geliştirme modunda çalıştır
npm run dev

# Testleri çalıştır
npm test

# Tip kontrolü
npm run typecheck

# Lint
npm run lint
```

## Katkıda Bulunma

Katkılarınızı bekliyoruz! Lütfen Pull Request göndermekten çekinmeyin.

## Lisans

MIT

## Teşekkürler

- [Model Context Protocol](https://modelcontextprotocol.io) ile geliştirildi
- [Puppeteer](https://pptr.dev/) ve [Cheerio](https://cheerio.js.org/) tarafından destekleniyor
- [ikas](https://ikas.dev) geliştirici topluluğu için oluşturuldu
