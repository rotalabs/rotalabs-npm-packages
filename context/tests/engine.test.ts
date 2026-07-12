import { describe, it, expect } from 'vitest';
import { ContextEngine, Scope, Sensitivity } from '../src/index.js';

describe('ContextEngine', () => {
  it('should create with default memory backend', () => {
    const engine = new ContextEngine();
    expect(engine).toBeDefined();
  });

  it('should ingest records and return result', async () => {
    const engine = new ContextEngine();
    const result = await engine.ingest({
      records: [
        { content: 'The deployment pipeline failed at stage 3', title: 'Incident #42' },
        { content: 'Agent exceeded token budget by 200%', title: 'Alert #99' },
      ],
      source: 'test-suite',
      tags: ['incident', 'ops'],
    });

    expect(result.entriesCreated).toBe(2);
    expect(result.entryIds).toHaveLength(2);
    expect(result.entryIds[0]).toMatch(/^ctx_/);
  });

  it('should search ingested content by keyword', async () => {
    const engine = new ContextEngine();
    await engine.ingest({
      records: [
        { content: 'Kubernetes pod crash loop detected in production' },
        { content: 'Memory leak in the authentication service' },
        { content: 'Database connection pool exhausted' },
      ],
      source: 'monitoring',
      tags: ['alert'],
    });

    const result = await engine.search('kubernetes production');
    expect(result.results.length).toBeGreaterThan(0);
    expect(result.results[0].entry.content).toContain('Kubernetes');
    expect(result.results[0].score).toBeGreaterThan(0);
    expect(result.tookMs).toBeGreaterThanOrEqual(0);
  });

  it('should filter search results by tags', async () => {
    const engine = new ContextEngine();
    await engine.ingest({
      records: [{ content: 'Error in payment processing module' }],
      source: 'payments',
      tags: ['critical'],
    });
    await engine.ingest({
      records: [{ content: 'Error in logging configuration' }],
      source: 'infra',
      tags: ['minor'],
    });

    const result = await engine.search('error', {
      filters: { tags: ['critical'] },
    });
    expect(result.results).toHaveLength(1);
    expect(result.results[0].entry.source).toBe('payments');
  });

  it('should filter search results by source', async () => {
    const engine = new ContextEngine();
    await engine.ingest({
      records: [{ content: 'Agent timeout on inference call' }],
      source: 'agentops',
      tags: ['timeout'],
    });
    await engine.ingest({
      records: [{ content: 'Agent policy violation detected' }],
      source: 'guardian',
      tags: ['policy'],
    });

    const result = await engine.search('agent', {
      filters: { sources: ['guardian'] },
    });
    expect(result.results).toHaveLength(1);
    expect(result.results[0].entry.source).toBe('guardian');
  });

  it('should filter by scope', async () => {
    const engine = new ContextEngine();
    await engine.ingest({
      records: [{ content: 'Shared context for all teams' }],
      source: 'system',
      scope: Scope.GLOBAL,
    });
    await engine.ingest({
      records: [{ content: 'Context for engineering team only' }],
      source: 'system',
      scope: Scope.TEAM,
    });

    const result = await engine.search('context', {
      filters: { scopes: [Scope.TEAM] },
    });
    expect(result.results).toHaveLength(1);
    expect(result.results[0].entry.scope).toBe('team');
  });

  it('should support event subscriptions', async () => {
    const engine = new ContextEngine();
    const events: Record<string, unknown>[] = [];

    const subId = engine.on('context.created', {}, (data) => {
      events.push(data);
    });

    await engine.ingest({
      records: [{ content: 'Test event firing' }],
      source: 'test',
    });

    expect(events).toHaveLength(1);
    expect(events[0]['source']).toBe('test');
    expect(events[0]['entriesCreated']).toBe(1);

    // Unsubscribe
    engine.off('context.created', subId);

    await engine.ingest({
      records: [{ content: 'Should not trigger' }],
      source: 'test2',
    });

    expect(events).toHaveLength(1); // Still 1 — unsubscribed
  });

  it('should return highlights in search results', async () => {
    const engine = new ContextEngine();
    await engine.ingest({
      records: [{
        content: 'The guardian service blocked a prompt injection attempt. The agent was trying to exfiltrate data. Security team was notified.',
      }],
      source: 'guardian',
      tags: ['security'],
    });

    const result = await engine.search('prompt injection');
    expect(result.results).toHaveLength(1);
    expect(result.results[0].highlights.length).toBeGreaterThan(0);
  });

  it('should respect topK limit', async () => {
    const engine = new ContextEngine();
    for (let i = 0; i < 10; i++) {
      await engine.ingest({
        records: [{ content: `Record number ${i} about deployment` }],
        source: 'test',
      });
    }

    const result = await engine.search('deployment', { topK: 3 });
    expect(result.results.length).toBeLessThanOrEqual(3);
  });

  it('should handle sensitivity levels', async () => {
    const engine = new ContextEngine();
    await engine.ingest({
      records: [{ content: 'Public API documentation' }],
      source: 'docs',
      sensitivity: Sensitivity.PUBLIC,
    });
    await engine.ingest({
      records: [{ content: 'Internal deployment runbook' }],
      source: 'ops',
      sensitivity: Sensitivity.CONFIDENTIAL,
    });

    const result = await engine.search('documentation runbook');
    expect(result.results.length).toBeGreaterThan(0);
    // Both should be returned (filtering by sensitivity is an API feature)
  });

  it('should use platform backend when apiKey is provided', () => {
    const engine = new ContextEngine({ apiKey: 'test-key-123' });
    expect(engine).toBeDefined();
    // Platform backend is selected but won't make actual API calls in test
  });

  it('should return empty results for non-matching query', async () => {
    const engine = new ContextEngine();
    await engine.ingest({
      records: [{ content: 'Kubernetes deployment failed' }],
      source: 'test',
    });

    const result = await engine.search('zzzzzzz');
    expect(result.results).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it('should assign unique IDs to ingested entries', async () => {
    const engine = new ContextEngine();
    const r1 = await engine.ingest({
      records: [{ content: 'First entry' }],
      source: 'test',
    });
    const r2 = await engine.ingest({
      records: [{ content: 'Second entry' }],
      source: 'test',
    });

    expect(r1.entryIds[0]).not.toBe(r2.entryIds[0]);
  });
});
