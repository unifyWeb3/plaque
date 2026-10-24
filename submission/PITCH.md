# One-page pitch — Plaque

> The slide deck is `submission/Plaque-pitch-deck.pdf` (9 slides, generated from `submission/deck.html`).

**Claim your name on Portaldot. You sign; a sponsor pays.**
The binding is public and verifiable. It is already live on the V3 testnet — signed by an account
that holds zero. The hosted app produces the signed payload; it does not send the transaction.

| | |
|---|---|
| **Problem** | A new Portaldot account holds 0 tPOT, so it cannot record anything on chain; testnet POT is a manual Discord ticket; the runtime ships `MetaTx`/`VerifySignature`; Plaque uses an ordinary sponsor transaction today, with `MetaTx` as roadmap. |
| **Audience** | People joining the Portaldot ecosystem — the ~168 hackers in this event, ecosystem newcomers, and the builders shipping their first dApp — plus the operators who want a permissionless directory instead of a hand-kept list. |
| **Solution** | A handle registry where the user signs one message and a sponsor pays. The contract recovers the signature itself and binds the name to the address that signed. |
| **Differentiation** | The submissions I could inspect skew to middleware, indexers and validator analytics, and a public ENS-style naming project also exists. Plaque does not claim a novel category; it claims a live, measured sponsored-write path and a public verifier. |
| **Architecture** | `PlaqueLite.sol` (302 bytes, deployed) → a dependency-free SDK (digest + one pure state function) → a Next.js dashboard that reads the chain server-side → a sponsor relayer that pays. A claim carries value 0; the lite fallback is payable but has no withdraw, so do not send tPOT to the contract. The sponsor pays the chain fee and deposit. |
| **Evidence** | Live contract `0x5432e6b8…b685` (block 167044), deployed bytecode byte-identical to the committed source. A live sponsored claim at block 167209, signed by `0xd35404…15Fe6` with a balance of **0 wei before, during and after**. `npm run verify:live`: 10 checks, all passing. 33 unit tests. |
| **Honest engineering** | This runtime reverts on the BLOCK-family opcodes (proved with two probe contracts) and charges a deposit per byte of code and per storage entry. Both constraints are documented with transactions; the deployed 302-byte build is the response to them, and one claim costs 3.87 tPOT, almost all of it the storage deposit. |
| **Business (model, not built)** | The sponsor is the customer: a hosted relayer with a per-developer budget, settled in the chain's native `Assets` pallet, priced per sponsored write (≈3.87 tPOT on this testnet, dominated by the chain's storage deposit). |
| **Maintenance** | A public directory is reusable: any later Portaldot app can read it from the RPC. The sponsored-write rail is a reusable onboarding primitive, not a claim that every dApp needs it. |
| **Roadmap** | Claim-then-confirm grace period → a hosted sponsor with on-chain budgets → release and signed transfers → a public handle indexer → mainnet with the cost model re-measured. |
