# Stage 8 — Judging simulation (against the verified rubric)

Rubric (verified from the event page, 2026-10-20): **Technical Feasibility 30 % · Innovation 30 % ·
Ecosystem Contribution 20 % · Business Potential 20 %.** The evidence a judge is told to use: the
GitHub repository, the commit timeline, the testnet transaction records, the contract addresses and
transaction hashes, and the live demo.

Scores below are my own estimate, with the evidence for each and an explicit note where the score is
judgement rather than fact. They are **not** a prediction of the result.

| Criterion | Weight | My score | Why |
|---|---|---|---|
| **Technical Feasibility** | 30 % | **26/30** | The core action is **live on the V3 testnet**: a claim signed by an account holding 0 wei, paid for by a sponsor, written to storage and to the event log (tx `0xa654bd9c…edf2`, block 167209). The deployed bytecode is byte-for-byte the committed source, `npm run verify:live` re-proves ten checks read-only, and 41 tests pass including a differential suite between the readable build and the deployed one. **Deduction:** the deployed 302-byte build omits `release` and transfers, there is no hosted relayer in the deployed app, and the sample is one claim rather than a busy registry. |
| **Innovation** | 30 % | **20/30** | A *consumer* app on Portaldot where the end user pays nothing, with the sponsorship public on chain, plus a cost model measured rather than assumed. The engineering response to a runtime that rejects BLOCK opcodes and charges per byte/per storage entry is itself a contribution. **Deduction:** sponsored writes are a known pattern elsewhere, and the novelty rests on Portaldot's economics and on the measured sponsored-write path; `MetaTx` is
not used (it is roadmap), so the pitch does not claim it. |
| **Ecosystem Contribution** | 20 % | **14/20** | A live registry other Portaldot apps can read from the public RPC, a sponsored-write rail, a verifier anyone can run, and a documented set of hard-won chain facts (gas-limit rule, deposit economics, BLOCK-opcode limitation) that every builder here will hit. **Deduction:** the rail is not yet a hosted service, so the contribution is a component plus a reference implementation. |
| **Business Potential** | 20 % | **11/20** | The sponsor is the customer, and the unit economics are now measured from a live claim (≈3.87 tPOT, dominated by the chain's storage deposit) instead of guessed. **Deduction:** no customer, no pricing validation, no demand evidence; the deposit makes sponsorship more expensive than a gas-only model, which weakens the "fund thousands of names" version of the pitch. |
| **Total** | 100 | **71/100** | A complete, honest, *working* live build: the thing the product promises happens on the real chain, and anyone can re-check it with one command. |

## The three strongest objections a skeptical judge could raise

**1. "Is the claim real, or a mock?"**
It is real, and this is now the strongest part of the submission rather than the weakest. The claim
transaction is on the V3 testnet (block 167209), the signer's balance was 0 wei before, during and
after, the storage slot holds the signer, and the event names the sponsor that paid. `npm run
verify:live` re-runs ten checks against the public RPC with no funds and no writes, including a live
signature matrix: a valid signature is accepted and a tampered one, a wrong-address one and a
zero-address one are refused. The lite contract does accept the zero *handle*; the app and relayer
reject it, and the limitation is recorded.

**2. "A name registry is not novel, and 'the sponsor pays' is a known pattern."**
*Fix applied:* the submission does not claim novelty in the abstract — it claims a narrower, verifiable gap: a consumer-facing registry with a measured sponsored-write
path and a public verifier; it does not claim that no other Portaldot consumer app exists. The differentiators are the measured cost model, the on-chain sponsor record,
the public verifier, and the fact that this is a *usable* consumer app rather than another middleware
layer. The design notes state the griefing weakness of gasless claims openly.

**3. "Why is the deployed contract assembly, and why is it not the readable one?"**
*Fix applied:* the repository explains the two measured constraints (BLOCK opcodes, deposits per byte
and per storage entry), keeps the readable builds (`Plaque.sol`, `PlaqueV2.sol`) and their tests, and
proves the deployed 302-byte build agrees with the readable one via a differential test suite. The
choice is presented as a cost decision with numbers, not as a style preference — and the alternative
(741 bytes, ~74.5 tPOT) is committed for a chain where the budget allows it.

## What I would do with more time, in order

1. Fund ~40 tPOT so the demo can show several live claims on camera (the sponsor holds 0.87 tPOT and
   one claim costs ≈3.87 tPOT).
2. Add the claim-then-confirm grace period, which removes the name-griefing weakness.
3. Port `release` and signed transfers into a funded, larger build.
4. Run the hosted sponsor for a week and publish the real cost ledger, so the business claim stops
   being a hypothesis.
