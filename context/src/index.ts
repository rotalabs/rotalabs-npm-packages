/**
 * @rotalabs/context - Context intelligence for AI agents
 *
 * Provides tools to ingest, search, and subscribe to shared context
 * across AI systems.
 */

export { ContextEngine } from './engine.js';
export type { ContextEngineOptions } from './engine.js';

export type {
  ContextEntry,
  IngestRecord,
  IngestRequest,
  IngestResult,
  SearchRequest,
  SearchResult,
  SearchHit,
  SearchFilters,
  Subscription,
  Entity,
} from './models.js';

export { Scope, Sensitivity } from './models.js';

export const version = '1.0.0';
