# @rotalabs/context

> Context intelligence for AI agents — Ingest, search, and subscribe to shared context across your AI systems.

Part of the [Rotalabs](https://rotalabs.ai) trust intelligence research ecosystem.

## Installation

```bash
npm install @rotalabs/context
```

## Quick Start

```typescript
import { ContextEngine } from '@rotalabs/context';

// Local mode (in-memory, zero config)
const ctx = new ContextEngine();

// Platform mode (connects to Rotascale)
const ctx = new ContextEngine({
  apiKey: 'rot_...',
  baseUrl: 'https://api.rotascale.com',
});

// Ingest
const result = await ctx.ingest({
  records: [
    { content: 'User reported login issue', title: 'Ticket #1234' },
    { content: 'Auth service latency spike', title: 'Incident report' },
  ],
  source: 'helpdesk',
  tags: ['support', 'auth'],
  scope: 'team:support',
});

// Search
const results = await ctx.search('login issues', { topK: 5, mode: 'semantic' });
for (const hit of results.results) {
  console.log(`${hit.score.toFixed(2)} — ${hit.entry.title}`);
}

// Subscribe to events
ctx.on('context.created', { filter: { tags: ['support'] } }, (event) => {
  console.log(`New context: ${event.title}`);
});
```

## License

Apache-2.0
