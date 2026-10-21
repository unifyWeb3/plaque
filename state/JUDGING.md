# Stage 8 — Judging simulation (against the verified rubric)

Rubric (verified from the event page, 2026-10-20): **Technical Feasibility 30 % · Innovation 30 % ·
Ecosystem Contribution 20 % · Business Potential 20 %.** The evidence a judge is told to use: the
GitHub repository, the commit timeline, the testnet transaction records, the contract addresses and
transaction hashes, and the live demo.

Scores below are my own estimate, with the evidence for each and an explicit note where the score is
judgement rather than fact. They are **not** a prediction of the result.

| Criterion | Weight | My score | Why |
|---|---|---|---|
| **Technical Feasibility** | 30 % | **21/30** | A real contract, compiled from committed source and deployed to the live V3 testnet with a **byte-for-byte bytecode comparison**; a live state-changing transaction; a second contract deployed and fully exercised (event + pinned state read); 16 unit tests with positive controls for every refusal; a working frontend that reads the chain. **Deduction:** the deployed build cannot complete a claim on this runtime (a chain limitation, proved with two probe contracts), so the product's core action is not demonstrable end-to-end on chain until the wallet is funded. |
| **Innovation** | 30 % | **19/30** | The gap is real and unoccupied: a *consumer* app on Portaldot where the end user pays nothing, with the sponsorship recorded on chain, plus the cost transparency that the chain's unusual economics make interesting. **Deduction:** sponsored writes are a known pattern elsewhere (gasless relayers), and the novelty rests on Portaldot's specific economics and its unused `MetaTx`/`VerifySignature` machinery rather than on a new cryptographic or protocol idea. |
| **Ecosystem Contribution** | 20 % | **13/20** | The sponsored-write rail is the first thing any Portaldot dApp needs once the chain is busy, and a handle registry is permanent infrastructure the whole ecosystem can read from the public RPC; the repository also documents hard-won chain facts (the gas-limit rule, the deposit economics, the BLOCK-opcode limitation) that every other builder will hit. **Deduction:** the rail is not yet running as a hosted service, so the contribution is a component, not yet a service. |
| **Business Potential** | 20 % | **10/20** | The sponsor is the customer, the unit cost is measured (≈0.01 tPOT per write), and a hosted relayer with on-chain budgets is a plausible business. **Deduction:** no customer, no price validation and no demand evidence — the honest position is that the business model is a hypothesis, and the chain's own token economics may never make sponsorship valuable. |
| **Total** | 100 | **63/100** | A complete, honest, live-verified build with one chain-level blocker that a single faucet top-up removes. |

## The three strongest objections a skeptical judge could raise

**1. "The contract is deployed but it cannot do the thing it exists for."**
This is the serious one, and it is true: the deployed build reads `block.chainid` inside the claim
digest, and this runtime reverts on that opcode, so every sponsored claim reverts.
*Fix applied:* the limitation is stated in the README, on the dashboard itself, and in
`state/CHAIN-LIMITATION.md`, with the two probe transactions that prove it; the chain-compatible
build (`contracts/PlaqueV2.sol`) is committed, tested and one command away from deployment; and the
funding request is the first thing in the README and in the final report. It is not hidden and it is
not explained away.

**2. "A name registry is not novel, and 'the sponsor pays' is a known pattern."**
*Fix applied:* the submission does not claim novelty in the abstract — it claims a gap that is
verifiable in the ecosystem (no consumer app on Portaldot, the sponsored path unused, the chain's
economics unmeasured). The differentiators that remain are the measured cost model, the on-chain
sponsor ledger, and the fact that the product is a *usable* consumer app rather than another
middleware layer. The design notes also state the griefing weakness of gasless claims openly, with
the mitigation planned.

**3. "How do I know the deployment matches the repository, and who paid for the gas?"**
*Fix applied:* the deployed bytecode is compared byte-for-byte with a fresh compile of the committed
source, with both keccak hashes recorded (`0xce34126d…73472ae`), the compiler version and settings
recorded, and the deployment transaction and block cited. The sponsorship is public: the claim event
carries the sponsor address and the gas price, and the sponsor ledger is in the dashboard. The
single trusted key (the sponsor's) is stated plainly, and the scripts show that it can only pay gas.

## What I would do with more time, in order

1. Fund and deploy the chain-compatible build, then record the sponsored claim end to end
   (a user with 0 tPOT, a sponsor paying, the registry updating) — this converts the biggest
   deduction into the strongest proof.
2. Add the claim-then-confirm grace period, which removes the name-griefing weakness.
3. Publish the demo video and the pitch deck (the two remaining submission artefacts).
4. Run the hosted sponsor for a week and publish the real cost ledger, so the business claim stops
   being a hypothesis.
