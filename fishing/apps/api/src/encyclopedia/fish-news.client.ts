import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

export type FishNewsArticle = {
  title: string;
  link: string;
  pubDate: string | null;
  source: string | null;
};

const NEWS_CACHE_TTL_MS = 15 * 60 * 1000;

@Injectable()
export class FishNewsClient {
  private readonly logger = new Logger(FishNewsClient.name);
  private readonly cache = new Map<string, { expiresAt: number; items: FishNewsArticle[] }>();

  async searchArticles(fishName: string, limit = 5): Promise<FishNewsArticle[]> {
    const key = fishName.trim();
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.items.slice(0, limit);
    }

    const query = encodeURIComponent(`${fishName} 낚시`);
    const url = `https://news.google.com/rss/search?q=${query}&hl=ko&gl=KR&ceid=KR:ko`;

    try {
      const res = await axios.get<string>(url, {
        timeout: 4000,
        headers: { 'User-Agent': 'FishRank/1.0' },
        responseType: 'text',
      });

      const items = this.parseRssItems(res.data, limit);
      this.cache.set(key, { items, expiresAt: Date.now() + NEWS_CACHE_TTL_MS });
      return items;
    } catch (err) {
      this.logger.warn(`News fetch failed for ${fishName}: ${err}`);
      if (cached) return cached.items.slice(0, limit);
      return [];
    }
  }

  private parseRssItems(xml: string, limit: number): FishNewsArticle[] {
    const items: FishNewsArticle[] = [];
    const itemBlocks = xml.match(/<item>[\s\S]*?<\/item>/gi) ?? [];

    for (const block of itemBlocks.slice(0, limit)) {
      const title = this.extractTag(block, 'title');
      const link = this.extractTag(block, 'link');
      if (!title || !link) continue;

      items.push({
        title: this.decodeEntities(title),
        link,
        pubDate: this.extractTag(block, 'pubDate'),
        source: this.extractSource(block),
      });
    }

    return items;
  }

  private extractTag(block: string, tag: string): string | null {
    const cdata = block.match(new RegExp(`<${tag}><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`));
    if (cdata?.[1]) return cdata[1].trim();
    const plain = block.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`));
    return plain?.[1]?.trim() ?? null;
  }

  private extractSource(block: string): string | null {
    const source = this.extractTag(block, 'source');
    if (source) return this.decodeEntities(source);
    const title = this.extractTag(block, 'title');
    const m = title?.match(/ - ([^-]+)$/);
    return m?.[1]?.trim() ?? null;
  }

  private decodeEntities(text: string): string {
    return text
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
  }
}
