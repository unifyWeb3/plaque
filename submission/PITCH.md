# One-page pitch — Plaque

**Claim your name on Portaldot without paying a thing.**
You sign, a sponsor pays, and the binding is public and verifiable. It is already live on the V3
testnet — signed by an account that holds zero.

| | |
|---|---|
| **Problem** | A new Portaldot account holds 0 tPOT, so it cannot record anything on chain; testnet POT is a manual Discord ticket; the runtime ships the gasless machinery (`MetaTx`, `VerifySignature`) and nobody has used it. |
| **Audience** | People joining the Portaldot ecosystem — the ~143 hackers in this event, ecosystem newcomers, and the builders shipping their first dApp — plus the operators who want a permissionless directory instead of a hand-kept list. |
| **Solution** | A handle registry where the user signs one message and a sponsor pays. The contract recovers the signature itself and binds the name to the address that signed. |
| **Differentiation** | The public Portaldot landscape is middleware, history indexers and validator analytics. Nobody has shipped a consumer-facing app on Portaldot, and nobody has used the sponsored-write path. Plaque is both: the first consumer app, and the first thing on the chain where the end user pays nothing. |
| **Architecture** | `PlaqueLite.sol` (302 bytes, deployed) → a dependency-free SDK (digest + one pure state function) → a Next.js dashboard that reads the chain server-side → a sponsor relayer that pays. The contract holds no funds; the sponsor only ever pays. |
| **Evidence** | Live contract `0x5432e6b8…b685` (block 167044), deployed bytecode byte-identical to the committed source. A live sponsored claim at block 167209, signed by `0xd35404…15Fe6` with a balance of **0 wei before, during and after**. `npm run verify:live`: 10 checks, all passing. 21 unit tests. |
| **Honest engineering** | This runtime reverts on the BLOCK-family opcodes (proved with two probe contracts) and charges a deposit per byte of code and per storage entry. Both constraints are documented with transactions; the deployed 302-byte build is the response to them, and one claim costs 3.87 tPOT, almost all of it the storage deposit. |
| **Business** | The sponsor is the customer: a hosted relayer with a per-developer budget, settled in the chain's native `Assets` pallet, priced per sponsored write (≈3.87 tPOT on this testnet, dominated by the chain's storage deposit). |
| **Maintenance** | A name registry is permanent infrastructure that every later Portaldot app can read from the public RPC, and the sponsored-write rail is the first thing any Portaldot dApp needs once the chain is busy. |
| **Roadmap** | Claim-then-confirm grace period → a hosted sponsor with on-chain budgets → release and signed transfers → a public handle indexer → mainnet with the cost model re-measured. |
