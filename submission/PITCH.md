# One-page pitch — Plaque

> The slide deck is `submission/Plaque-pitch-deck.pdf` (9 slides, generated from `submission/deck.html`).

**Plaque is a reference implementation of a sponsored (gasless) write on Portaldot.** A user with a
zero balance signs once; a relayer verifies and pays; the chain records who claimed. The handle
registry is the example write.

| | |
|---|---|
| **Problem** | A new Portaldot account holds 0 tPOT, so it cannot record anything on chain; testnet POT is a manual support ticket. Every dApp that wants to grow has to ask people to buy gas first. |
| **Audience** | People joining the Portaldot ecosystem — newcomers and builders shipping their first dApp — plus operators who want a permissionless directory instead of a hand-kept list. |
| **Solution** | A reusable sponsored-write rail: the user signs one domain-bound message, the relayer verifies it off-chain and pays, the contract records the signer. The registry demonstrates it end to end. |
| **Track** | **Modular Cloud & Middleware** — the official text asks for decentralized middleware, storage/data components and APIs on Portaldot's modular architecture. The relayer/signature/storage primitive is the middleware; the registry is the reference consumer. |
| **Differentiation** | The submissions I could inspect skew to middleware, indexers, validator analytics and a broader public naming service. Plaque does not claim a novel category; it claims a live, measured sponsored-write path, a reusable integration kit and a public verifier. |
| **Architecture** | `PlaqueLite.sol` (302 bytes, deployed) → a dependency-free SDK (digest + one pure state function) → a Next.js dashboard that reads the chain server-side → a sponsor relayer that verifies, applies caps and pays. A claim carries value 0; the lite fallback is payable but has no withdraw, so do not send tPOT to the contract. |
| **Evidence** | Live contract `0x5432e6b8…b685` (block 167044), deployed bytecode byte-identical to the committed source. A live sponsored claim at block 167209, signed by `0xd35404…15Fe6` with a balance of **0 wei before, during and after**. `npm run verify:live`: 10 checks, all passing. **41 tests**. `docs/INTEGRATE.md` is the under-10-minute integration path. |
| **Honest engineering** | This runtime reverts on the BLOCK-family opcodes (proved with two probe contracts) and charges a deposit per byte of code and per storage entry. Both constraints are documented with transactions; the deployed 302-byte build is the response, and one claim costs 3.87 tPOT, almost all of it the storage deposit. |
| **Business (model, not built)** | The sponsor is the customer: a hosted relayer with a per-developer budget, settled in the chain's native `Assets` pallet, priced per sponsored write (≈3.87 tPOT on this testnet, dominated by the storage deposit). |
| **Maintenance** | A public directory is reusable: any later Portaldot app can read it from the RPC. The sponsored-write rail is a reusable onboarding primitive; the registry is the first consumer. |
| **Roadmap** | Claim-then-confirm grace period → a hosted sponsor with on-chain budgets → release and signed transfers → a public handle indexer → mainnet with the cost model re-measured. |
