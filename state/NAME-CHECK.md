# Stage 2.4 — Name availability check

Checked 2026-10-21 from this machine (GitHub REST API, npm registry, Vercel CLI) plus a public web search.

| Candidate | GitHub `unifyWeb3/<name>` | npm `<name>` | Vercel scope `oxunifyy` | Public-project clash | Verdict |
|---|---|---|---|---|---|
| earlier working name | free (404) | the obvious npm names were taken | free | **Clash:** a live DeFi notification protocol with its own on-chain registry, plus several unrelated uses in other ecosystems (names not repeated here) | **rejected** |
| gazette | free | — | free | no crypto clash found | rejected (too newspaper-y; misses the sponsored-write half) |
| steward | free | — | free | widely used in staking/custody contexts | rejected (custody/staking connotations) |
| almanac | free | — | free | no clash | rejected (directory-only, misses the rail) |
| sponsor | — | — | — | reads as a fee | rejected |
| tab | — | — | — | reads as credit/escrow | rejected (brief excludes escrow framing) |
| **plaque** | **free (404)** | **free (E404)** | **free** (not in `vercel project ls`) | no web3/name-registry clash found in public search | **CHOSEN** |
| byword | free | `byword@0.1.2` | free | no clash | runner-up |
| bullhorn | free | `bullhorn@0.3.1` | free | no clash | runner-up |
| towncrier | free | `towncrier@0.1.0` | free | no clash | runner-up |
| muster / callboard / rollcall | free | `muster@0.9.3` / `callboard@0.0.1` / free | free | a workforce-management product uses a similar name | rejected |

**Chosen name: `Plaque`.**

- One word, concrete, memorable, not AI-flavoured, no known crypto project uses it for a name registry.
- Semantics: a plaque is a plate that carries a name and is mounted to announce who you are — exactly what an
  on-chain handle does.
- Availability **verified**, not assumed: `unifyWeb3/plaque` returns 404, `plaque` is not on npm, and no
  `plaque*` project exists in the authenticated Vercel scope `oxunifyy`.
- Product slug: repository `plaque`, Vercel project `plaque` → `plaque-oxunify.vercel.app`.
