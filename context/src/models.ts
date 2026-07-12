/**
 * Data models for @rotalabs/context.
 */

export enum Scope {
  GLOBAL = 'global',
  TEAM = 'team',
  AGENT = 'agent',
  PROJECT = 'project',
  USER = 'user',
}

export enum Sensitivity {
  PUBLIC = 'public',
  INTERNAL = 'internal',
  CONFIDENTIAL = 'confidential',
  RESTRICTED = 'restricted',
}

export interface ContextEntry {
  id: string;
  source: string;
  sourceId?: string;
  contentType: string;
  title?: string;
  content: string;
  contentHash: string;
  tags: string[];
  scope: string;
  sensitivity: string;
  metadata: Record<string, unknown>;
  createdAt?: string;
}

export interface IngestRecord {
  content: string;
  title?: string;
  contentType?: string;
  sourceId?: string;
  metadata?: Record<string, unknown>;
}

export interface IngestRequest {
  records: IngestRecord[];
  source: string;
  tags?: string[];
  scope?: string;
  sensitivity?: string;
  generateEmbeddings?: boolean;
  extractEntities?: boolean;
}

export interface IngestResult {
  entriesCreated: number;
  embeddingsGenerated: number;
  entitiesExtracted: number;
  entryIds: string[];
}

export interface SearchFilters {
  tags?: string[];
  sources?: string[];
  scopes?: string[];
  sensitivity?: string[];
  dateFrom?: string;
  dateTo?: string;
}

export interface SearchRequest {
  query: string;
  topK?: number;
  mode?: 'semantic' | 'keyword' | 'hybrid';
  filters?: SearchFilters;
}

export interface SearchHit {
  entry: ContextEntry;
  score: number;
  highlights: string[];
  matchType: string;
}

export interface SearchResult {
  query: string;
  mode: string;
  results: SearchHit[];
  total: number;
  tookMs: number;
}

export interface Subscription {
  id: string;
  subscriberId: string;
  subscriberType: string;
  filterTags: string[];
  filterScopes: string[];
  filterSources: string[];
  deliveryMethod: string;
  webhookUrl?: string;
  isActive: boolean;
}

export interface Entity {
  id: string;
  name: string;
  entityType: string;
  sourceEntryId?: string;
  metadata: Record<string, unknown>;
  mentionsCount: number;
}
