# Stage 1 — Field research (public information only)

Checked 2026-10-21 from: the GitHub API, the DoraHacks event page, `portaldot-dev.readthedocs.io`, and
the Portaldot V3 testnet itself.

> **Naming policy.** The four public profiles this brief asked us to study, and the public projects
> we read, are described here **by what they do, never by name or repository identifier** — the
> brief forbids naming them anywhere in this repository, its commits, UI, docs or submission text.
> The labels below (`Profile A` … `Profile D`, and the functional descriptions) are stable within
> this document so the map stays readable. No code, architecture, wording, visual design or
> presentation structure was copied from any of them.

---

## 1. The four public profiles (project work only)

| Profile | Portaldot project? | Track | Stage | Core functionality | UI / communication | Verified live vs described |
|---|---|---|---|---|---|---|
| **A** (40 public repos) | **None** | n/a | n/a | Privacy layer for onchain finance, tokenised-stock refraction, agent tooling, a security-assessment playbook | TypeScript/Next.js monorepos, README-first, evidence-bundle oriented | Repos are mostly described rather than shipped; no Portaldot work |
| **B** (72 public repos) | **None** | n/a | n/a | Agent marketplaces, shared-budget control layers, confidential delegated spending, scoped wallet sessions | Next.js apps with a "prove it" evidence theme, docs sites | No Portaldot work |
| **C** (52 public repos) | **None** | n/a | n/a | AI payroll agents with on-chain spend caps, on-chain transaction-verification miners, incident-response tooling | Solidity + TypeScript, evidence-first write-ups | No Portaldot work |
| **D** (97 public repos) | **None** | n/a | n/a | Counterparty-risk oracles, chaos-engineering harnesses, agent runtimes, attestation systems | Solidity + TypeScript, dense evidence tables | No Portaldot work |

**Finding:** none of the four has a Portaldot project, so none of them is a direct competitor in this
event. What they *do* establish is the ecosystem's prevailing aesthetic: proof-carrying, evidence-first,
agent-oriented builds with heavy "attestation / receipt / oracle" framing. That framing is **crowded** —
a submission that leans on "another attestation registry" would be easy to dismiss as the house style.
A different, more product-shaped angle is safer.

## 2. Portaldot projects found in public repositories

| Project (described by function) | Track | What it does | Depth / evidence |
|---|---|---|---|
| A manifest-driven execution middleware | 1 Modular Cloud & Middleware | Reads the live runtime, compiles exact calls from the chain's own metadata, checks them against a policy, has the user's own wallet sign, re-checks at a submit gate, waits for finality and ends with a receipt anyone can re-verify. Refuses to build a call the metadata does not contain | **High.** 18 real V3 testnet transactions, contract deploys through the runtime, `Assets`/`Nfts` calls, rollback, an offline SDK with vitest suites, a recorded demo script and an explicit verified/not-verified table |
| A verifiable on-chain history indexer | 1 Modular Cloud & Middleware | Publishers store canonical index chunks in the chain's own transaction-storage pallet; browsers re-derive every row from source-chain events and reconcile balances (integrity → row truth → reconciliation), so a lying publisher is caught | **High.** Live static app, a Solidity registry on the EVM, real chain data, "verify the publisher, not the publisher" framing |
| A validator / delegation-risk report | 3 Node Operations | Reads the chain, scores validators on measurable behaviour, publishes the scores and a merkle root so the numbers cannot be changed afterwards | **High.** Real mainnet archive analysis across eras, live page, merkle root recomputed at build time |
| A cross-chain intent settler | 2 Multi-Chain | An external decision layer computes a route; the chain's vault re-validates that route on chain and only then moves funds | Medium, early; heavy external dependency |
| A chain-compatible contract toolchain | 1 | A WASM validator built from the chain's own `prepare.rs` and a deploy path for the legacy gas signature | Low/legacy |
| A bonded, challenge-verified storage protocol with an accountable agent | 1 | Storage whose claims are challenged and settled on chain | Medium |
| A pre-contract outcome simulator for a fixed-value engagement | — | Rehearses success/delay/non-delivery outcomes before signing; its own status table says the simulator is simulated and the ink! contract is a "demo candidate, not built" | **Low** |
| A Portaldot light client verified from Ethereum | 2 | Verifies Portaldot finality and storage proofs from EVM contracts | Medium |
| Earlier mini-hackathon tooling: a failure-diagnosis kit, an MCP server with 34 chain tools, an intent parser over six pallets, permissionless micro-grants, a pay-per-call gateway | 1/3/4 | Developer tooling rather than products | Medium |

Also present: the official wallet, a node guide, and a developer playground (wallet, explorer, faucet,
RPC tools, message board).

## 3. What the chain itself says (verified on the V3 testnet)

- The V3 EVM had **zero transactions** in the 1,500 blocks scanned before this build, and only one
  contract had ever been deployed by anyone else. The consumer-facing EVM surface of Portaldot V3 was
  effectively empty.
- Live pallets with real data: `staking` (era 36, **2 validators**), `session`, `mixnet` (session 219
  — active), `assets` (2 assets, one with a 150,000 tPOT supply), `Identity` (empty). The broker and
  the oracle are empty, so neither can be demoed.
- `pallet-revive` (EVM) **and** `pallet-contracts` (WASM) both live in the same runtime, plus
  `MetaTx` (gasless meta-transactions), `VerifySignature`, `SkipFeelessPayment`, `AssetsPrecompiles`
  (the EVM can reach the `Assets` pallet) and `TransactionStorage`.
- **Cost model measured** (superseded 2026-10-24: a *claim* writes storage, so it costs 3.87 tPOT — see
  `state/MEMORY.md` §2 for the final numbers; the figures here are gas-only calls and code deposits): ~0.01 tPOT per call, **~0.095 tPOT per byte of deployed code**, and the
  storage-deposit limit is derived from the transaction's gas limit — so a deployment fails unless the
  gas limit is large enough. Typical account balances are 1–10 tPOT, so most accounts cannot deploy
  anything, and the chain's EVM gas unit is ~1e12 per call rather than mainnet's 21,000.

## 4. Competitor and ecosystem map

**Saturated:** transaction-execution middleware and verifiable receipts; verifiable off-chain→on-chain
history and storage; the "attestation / oracle / receipt" framing in general; validator-concentration
analytics.

**Present but thin:** cross-chain intent settlement, a light client, bonded storage, node and developer
tooling.

**Empty:**
1. **Track 4 (Ecosystem DApps)** — no consumer-facing application is visible in any public Portaldot
   repository.
2. **The sponsored / gasless write path.** `MetaTx` and `VerifySignature` exist in the runtime, but no
   public project uses them, and no project addresses the fact that **a brand-new Portaldot user with
   0 tPOT cannot record anything on-chain** — the cold-start wall for the whole ecosystem.
3. **A permissionless, on-chain directory/identity primitive** for the ecosystem (the ecosystem
   support programme itself talks about an "official ecosystem listing", which today is a manual list).
4. **Cost transparency** — nobody publishes what an action costs on this chain, even though the cost
   model is unusual (14-decimal POT, a storage deposit per claim, a code deposit per byte) and is a real
   trap for builders.

**What remains unverified:** the event's build list is still "under organizer review", so the actual
in-event competitor set cannot be enumerated; other submissions may land before 2026-11-06. Public
repositories are also only a partial view of what people build in private. Both gaps are stated rather
than papered over.

## 5. The gap we chose

> **Portaldot's EVM has no consumer application, and its users have no POT.**
> A brand-new account with a zero balance cannot make a single on-chain record; the faucet is a manual
> Discord ticket; the chain's own runtime ships `MetaTx`/`VerifySignature`; and nobody has built the
> layer that lets an ordinary user act on Portaldot for free while a sponsor pays, atomically and
> verifiably, in native POT.

Everything below is built on that gap. It is not an attestation registry (crowded), not a middleware
re-implementation, not history storage and not validator analytics.
