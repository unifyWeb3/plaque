# AGENTS.md

Plaque is a small, reproducible reference implementation. Keep changes narrow and evidence-backed.

## Commands

```bash
npm ci                 # root tooling and tests
npm run compile        # pinned solc builds into build/
npm test               # 41 tests; includes a local Ganache chain
npm run verify:live    # read-only checks against the deployed contract
cd web && npm ci && npm run typecheck && npm run lint && npm run build
```

## Rules

- Do not commit keys, `.env` files, `secrets/`, or deployment credentials.
- Do not change the deployed contract address or the existing claim transaction.
- The canonical config is `config/plaque.json`; `web/lib/plaque-config.json` is a byte-identical mirror for the Vercel root.
- The relayer is a local demo sponsor, not a public service. It validates signatures off-chain before spending gas.
- Keep public docs free of third-party project and person names.
