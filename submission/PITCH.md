# One-page pitch — Plaque

**Claim your name on Portaldot without paying a thing.**
You sign, a sponsor pays the gas, and the binding is permanent, public and verifiable.

| | |
|---|---|
| **Problem** | A new Portaldot account holds 0 tPOT, so it cannot record anything on chain; testnet POT is a manual Discord ticket; the runtime ships the gasless machinery (`MetaTx`, `VerifySignature`) and nobody has used it. |
| **Audience** | People joining the Portaldot ecosystem — the ~143 hackers in this event, ecosystem newcomers, and the builders shipping their first dApp — plus the operators who want a permissionless directory instead of a hand-kept list. |
| **Solution** | A handle registry where the user signs one message and a sponsor pays the gas. The contract recovers the signature itself and binds the name to the address that signed. |
| **Differentiation** | The public Portaldot landscape is middleware, history indexers and validator analytics. Nobody has shipped a consumer-facing app on Portaldot, and nobody has used the sponsored-write path. Plaque is both: the first consumer app, and the first thing on the chain where the end user pays nothing. |
| **Architecture** | `Plaque.sol` (Solidity, `pallet-revive`) → a dependency-free SDK (digest + one pure state function) → a Next.js dashboard that reads the chain server-side → a sponsor relayer that pays the gas. The contract holds no funds; the sponsor only ever pays gas. |
| **Evidence** | Deployed at `0xa0e58d0c6392048959c0b16a9d3696fe49d063d6` in block 132033; the deployed bytecode is byte-identical to a fresh compile of the committed source; a live state-changing transaction from the same wallet; 16 unit tests, all passing; browser QA at 390×844 and 1280×900. |
| **Honest limit** | This runtime reverts on the BLOCK-family opcodes, so the deployed build cannot complete a claim here. Two probe contracts prove it; a chain-compatible build is committed and one faucet top-up away. |
| **Business** | The sponsor is the customer: a hosted relayer with a per-developer budget, settled in the chain's native `Assets` pallet, priced per sponsored write (≈0.01 tPOT each on the testnet). |
| **Maintenance** | A name registry is permanent infrastructure that every later Portaldot app can read from the public RPC, and the sponsored-write rail is the first thing any Portaldot dApp needs once the chain is busy. |
| **Roadmap** | Deploy the chain-compatible build → claim-then-confirm grace period → a hosted sponsor with on-chain budgets → signed handle transfers → mainnet → a public handle indexer. |
