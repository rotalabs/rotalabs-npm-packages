/**
 * ContextEngine — main entry point for @rotalabs/context.
 */

import type {
  ContextEntry,
  IngestRequest,
  IngestResult,
  SearchFilters,
  SearchHit,
  SearchResult,
} from './models.js';

export interface ContextEngineOptions {
  /** Rotascale API key. Enables platform mode. */
  apiKey?: string;
  /** Base URL for the Rotascale API. */
  baseUrl?: string;
  /** Backend type: 'memory' or 'platform'. */
  backend?: 'memory' | 'platform';
}

interface EventHandler {
  id: string;
  callback: (data: Record<string, unknown>) => void;
  filter: Record<string, unknown>;
}

interface Backend {
  ingest(request: IngestRequest): Promise<IngestResult>;
  search(query: string, topK: number, mode: string, filters: SearchFilters): Promise<SearchResult>;
}

/**
 * Context intelligence engine.
 *
 * Works in two modes:
 * - **Local mode** (default): In-memory backend for development.
 * - **Platform mode**: Connects to Rotascale API for managed context.
 */
export class ContextEngine {
  private backend: Backend;
  private eventHandlers: Map<string, EventHandler[]> = new Map();
  private handlerCounter = 0;

  constructor(options: ContextEngineOptions = {}) {
    const backendType = options.backend ?? (options.apiKey ? 'platform' : 'memory');

    if (backendType === 'platform') {
      this.backend = new PlatformBackend(options.apiKey ?? '', options.baseUrl ?? 'https://api.rotascale.com');
    } else {
      this.backend = new MemoryBackend();
    }
  }

  /**
   * Ingest records into the context store.
   */
  async ingest(request: IngestRequest): Promise<IngestResult> {
    const result = await this.backend.ingest(request);

    this.fireEvent('context.created', {
      source: request.source,
      entriesCreated: result.entriesCreated,
      entryIds: result.entryIds,
    });

    return result;
  }

  /**
   * Search the context store.
   */
  async search(
    query: string,
    options: { topK?: number; mode?: 'semantic' | 'keyword' | 'hybrid'; filters?: SearchFilters } = {},
  ): Promise<SearchResult> {
    const { topK = 20, mode = 'hybrid', filters = {} } = options;
    return this.backend.search(query, topK, mode, filters);
  }

  /**
   * Subscribe to context events.
   */
  on(
    eventType: string,
    options: { filter?: Record<string, unknown> },
    callback: (data: Record<string, unknown>) => void,
  ): string {
    const id = `sub_${++this.handlerCounter}`;
    const handlers = this.eventHandlers.get(eventType) ?? [];
    handlers.push({ id, callback, filter: options.filter ?? {} });
    this.eventHandlers.set(eventType, handlers);
    return id;
  }

  /**
   * Remove an event subscription.
   */
  off(eventType: string, subscriptionId: string): void {
    const handlers = this.eventHandlers.get(eventType);
    if (handlers) {
      this.eventHandlers.set(
        eventType,
        handlers.filter((h) => h.id !== subscriptionId),
      );
    }
  }

  private fireEvent(eventType: string, data: Record<string, unknown>): void {
    const handlers = this.eventHandlers.get(eventType) ?? [];
    for (const handler of handlers) {
      const filterTags = handler.filter['tags'] as string[] | undefined;
      if (filterTags && Array.isArray(data['tags'])) {
        const dataTags = data['tags'] as string[];
        if (!filterTags.some((t) => dataTags.includes(t))) continue;
      }
      try {
        handler.callback(data);
      } catch {
        // Silent failure for event handlers
      }
    }
  }
}


// ── Memory Backend ────────────────────────────────────────

function hashContent(content: string): string {
  // Simple hash for browser/Node compatibility
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

function tokenize(text: string): Set<string> {
  return new Set(text.toLowerCase().match(/[a-z0-9]+/g) ?? []);
}

class MemoryBackend implements Backend {
  private entries: ContextEntry[] = [];
  private counter = 0;

  async ingest(request: IngestRequest): Promise<IngestResult> {
    const entryIds: string[] = [];

    for (const record of request.records) {
      this.counter++;
      const id = `ctx_${String(this.counter).padStart(6, '0')}`;
      const entry: ContextEntry = {
        id,
        source: request.source,
        sourceId: record.sourceId,
        contentType: record.contentType ?? 'text',
        title: record.title,
        content: record.content,
        contentHash: hashContent(record.content),
        tags: request.tags ?? [],
        scope: request.scope ?? 'global',
        sensitivity: request.sensitivity ?? 'internal',
        metadata: record.metadata ?? {},
        createdAt: new Date().toISOString(),
      };
      this.entries.push(entry);
      entryIds.push(id);
    }

    return {
      entriesCreated: request.records.length,
      embeddingsGenerated: 0,
      entitiesExtracted: 0,
      entryIds,
    };
  }

  async search(
    query: string,
    topK: number,
    _mode: string,
    filters: SearchFilters,
  ): Promise<SearchResult> {
    const start = performance.now();
    const queryTokens = tokenize(query);
    const scored: SearchHit[] = [];

    for (const entry of this.entries) {
      // Apply filters
      if (filters.tags?.length && !filters.tags.some((t) => entry.tags.includes(t))) continue;
      if (filters.sources?.length && !filters.sources.includes(entry.source)) continue;
      if (filters.scopes?.length && !filters.scopes.includes(entry.scope)) continue;

      const text = `${entry.title ?? ''} ${entry.content}`;
      const textTokens = tokenize(text);

      if (queryTokens.size === 0) continue;

      const overlap = new Set([...queryTokens].filter((t) => textTokens.has(t)));
      if (overlap.size === 0) continue;

      const score = overlap.size / queryTokens.size;

      // Extract highlights
      const highlights: string[] = [];
      for (const sentence of entry.content.split(/[.!?\n]+/)) {
        const trimmed = sentence.trim();
        if (!trimmed) continue;
        const sentTokens = tokenize(trimmed);
        if ([...queryTokens].some((t) => sentTokens.has(t))) {
          highlights.push(trimmed.slice(0, 200));
          if (highlights.length >= 3) break;
        }
      }

      scored.push({
        entry,
        score: Math.round(score * 10000) / 10000,
        highlights,
        matchType: 'keyword',
      });
    }

    scored.sort((a, b) => b.score - a.score);
    const results = scored.slice(0, topK);
    const tookMs = Math.round((performance.now() - start) * 100) / 100;

    return { query, mode: _mode, results, total: results.length, tookMs };
  }
}


// ── Platform Backend ──────────────────────────────────────

class PlatformBackend implements Backend {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl: string) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  private async request<T>(path: string, body: unknown): Promise<T> {
    const resp = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': '@rotalabs/context/1.0.0',
      },
      body: JSON.stringify(body),
    });
    if (!resp.ok) {
      throw new Error(`API error: ${resp.status} ${resp.statusText}`);
    }
    return resp.json() as Promise<T>;
  }

  async ingest(request: IngestRequest): Promise<IngestResult> {
    const data = await this.request<{
      entries_created: number;
      embeddings_generated: number;
      entities_extracted: number;
      entry_ids: string[];
    }>('/v1/context-engine/ingest', {
      records: request.records.map((r) => ({
        content: r.content,
        title: r.title,
        content_type: r.contentType ?? 'text',
        source_id: r.sourceId,
        metadata: r.metadata ?? {},
      })),
      source: request.source,
      tags: request.tags ?? [],
      scope: request.scope ?? 'global',
      sensitivity: request.sensitivity ?? 'internal',
      generate_embeddings: request.generateEmbeddings ?? true,
      extract_entities: request.extractEntities ?? true,
    });

    return {
      entriesCreated: data.entries_created,
      embeddingsGenerated: data.embeddings_generated,
      entitiesExtracted: data.entities_extracted,
      entryIds: data.entry_ids,
    };
  }

  async search(
    query: string,
    topK: number,
    mode: string,
    filters: SearchFilters,
  ): Promise<SearchResult> {
    const data = await this.request<{
      query: string;
      mode: string;
      results: Array<{
        entry: Record<string, unknown>;
        score: number;
        highlights: string[];
        match_type: string;
      }>;
      total: number;
      took_ms: number;
    }>('/v1/context-engine/search', {
      query,
      top_k: topK,
      mode,
      filters: Object.keys(filters).length > 0 ? filters : undefined,
    });

    return {
      query: data.query,
      mode: data.mode,
      results: data.results.map((hit) => ({
        entry: {
          id: hit.entry['id'] as string,
          source: hit.entry['source'] as string,
          contentType: (hit.entry['content_type'] as string) ?? 'text',
          title: hit.entry['title'] as string | undefined,
          content: hit.entry['content'] as string,
          contentHash: (hit.entry['content_hash'] as string) ?? '',
          tags: (hit.entry['tags'] as string[]) ?? [],
          scope: (hit.entry['scope'] as string) ?? 'global',
          sensitivity: (hit.entry['sensitivity'] as string) ?? 'internal',
          metadata: (hit.entry['entry_metadata'] as Record<string, unknown>) ?? {},
        },
        score: hit.score,
        highlights: hit.highlights,
        matchType: hit.match_type,
      })),
      total: data.total,
      tookMs: data.took_ms,
    };
  }
}
