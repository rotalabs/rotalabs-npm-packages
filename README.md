# Rotalabs npm packages

Monorepo for the `@rotalabs/*` npm libraries: TypeScript/JavaScript counterparts of the [Rotalabs PyPI packages](https://pypi.org/user/rotalabs/) for AI trust, evaluation, and reliability.

| Package | Description |
|---|---|
| [@rotalabs/accel](https://www.npmjs.com/package/@rotalabs/accel) | Inference acceleration with speculative decoding |
| [@rotalabs/audit](https://www.npmjs.com/package/@rotalabs/audit) | Reasoning chain capture for auditing |
| [@rotalabs/cascade](https://www.npmjs.com/package/@rotalabs/cascade) | Domain-agnostic trust cascade routing |
| [@rotalabs/comply](https://www.npmjs.com/package/@rotalabs/comply) | Compliance evaluations for AI agents |
| [@rotalabs/context](https://www.npmjs.com/package/@rotalabs/context) | Context intelligence for AI agents - Ingest, search, and subscribe to shared context |
| [@rotalabs/eval](https://www.npmjs.com/package/@rotalabs/eval) | Distributed LLM evaluation at scale |
| [@rotalabs/ftms](https://www.npmjs.com/package/@rotalabs/ftms) | Field-theoretic memory for AI agents |
| [@rotalabs/graph](https://www.npmjs.com/package/@rotalabs/graph) | GNN-based trust propagation |
| [@rotalabs/probe](https://www.npmjs.com/package/@rotalabs/probe) | Sandbagging detection via metacognitive probes |
| [@rotalabs/rotalabs](https://www.npmjs.com/package/@rotalabs/rotalabs) | Trust Intelligence Research - Core package with shared utilities |
| [@rotalabs/steer](https://www.npmjs.com/package/@rotalabs/steer) | Runtime behavior control with steering vectors |
| [@rotalabs/verify](https://www.npmjs.com/package/@rotalabs/verify) | Verified code synthesis with CE2P hypothesis |

Red Queen (`@rotalabs/redqueen`) lives in its own repo: [rotalabs-redqueen-js](https://github.com/rotalabs/rotalabs-redqueen-js).

## Publishing

Packages publish to npm via keyless [Trusted Publishing](https://docs.npmjs.com/trusted-publishers) (OIDC, signed provenance) from `.github/workflows/publish.yml`. On push to `main` (or manual dispatch), any package whose local version differs from the registry is published.

## License

Apache-2.0. See each package's LICENSE and NOTICE files. (Red Queen, in its own repo, is AGPL-3.0-or-later with commercial licensing available.)

## Links

- Website: [rotalabs.ai](https://rotalabs.ai)
- Contact: [research@rotalabs.ai](mailto:research@rotalabs.ai)
