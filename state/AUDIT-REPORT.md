# Plaque — final audit report

**When:** 2026-10-24 19:45Z. **Human submits; the agent did not submit, record or redeploy the contract.**

## 1. Verdict
Ship the live sponsored-write reference and the audit; do not add scope or a new contract. (Judgment.)

## 2. Scope and method
Stages A–D were run in order. Every gate is labelled PASS/FAIL/BLOCKED/NOT VERIFIED with a command, exit code and timestamp in `state/AUDIT-CLAIMS.md`; unrun checks are not PASS. (Fact.)

## 3. Stage A — close the gaps
The zero-key probe passes 6/6 at block 178891: zero address refused, invalid signature refused, zero handle accepted by the frozen contract with the signer as owner, state unchanged. The relayer now rejects recovered-zero/wrong-owner signatures; 7 policy tests cover per-IP/per-origin/per-owner/global/min-balance with positive controls; HTTP 429/403/400 refusals were exercised. Root `npm ci`, web lint and `AGENTS.md` are fixed. (Facts.)

## 4. Stage B — positioning and kit
The pitch leads with a sponsored gasless write and uses the **Modular Cloud & Middleware** track; the handle registry is the example. `docs/INTEGRATE.md` documents the client, relayer module, config, storage slot and event. The public clone followed the guide: install, compile, tests and web build all passed. No novelty claim and no third-party project/person names remain in public docs. (Facts.)

## 5. Stage C — demo readiness
`submission/DEMO-SCRIPT.md` is a timed 2:50 shot list with exact commands, on-screen proof, rehearsal checklist and a no-funds fallback using the existing claim. The sponsor holds **0.874819 tPOT** and can fund **0** live claims; at 31,970 wei one needs 4.2561 tPOT, so top up ≥**3.3813 tPOT** now (5 tPOT recommended). No recording was made. (Facts.)

## 6. Stage D — release gates
Public clone `8ff97b6` of the GitHub repository: root `npm ci` 0, compile 0, `npm test` **41/41** 0, `npm run verify:live` **10/10** 0, web `npm ci`/typecheck/lint/build 0; `npm run demo` 0. (Facts.)

## 7. Deployment
The push triggered exactly one new production deployment, `dpl_EtcdZMMUyLpzF7DtomUohmui2pUs`, Ready in 36 s at 19:19:56Z; `plaque-oxunify.vercel.app` serves the new copy, reads contract `0x5432e6b8…b685` at block 178710, and hosted QA exits 0. (Facts.)

## 8. Claim table
28 rows: **27 PASS, 1 BLOCKED, 0 FAIL, 0 NOT VERIFIED**. The blocked row is the required demo video. The earlier novelty FAIL was removed by deleting the claim, not by rephrasing it. (Facts.)

## 9. Blockers and manual actions
Record the ≤3-minute video and submit the final form before 2026-11-06 04:00 UTC; check-in was already submitted. A new live claim needs the sponsor top-up above. (Facts/action.)

## 10. Facts
Live contract `0x5432e6b8…b685` (deploy block 167044), 302-byte reproducible runtime, live claim `0xa654bd9c…edf2` (block 167209) from a signer with 0 wei, sponsor paid 3.8695 tPOT, 41 tests, 10 verifier checks. (Facts.)

## 11. Judgments
The name-registry category is not novel; the defensible artifact is the reusable sponsored-write rail plus a measured, reproducible live receipt and an integration kit. Do not redeploy: the frozen build is honest and the remaining limits are documented. (Judgment.)

## 12. Uncertainty
Judge reaction to a crowded category, RPC log retention, gas-price movement changing the top-up threshold, and future Vercel/Git behavior. (Uncertainty.)

## 13. Evidence
`state/AUDIT-CLAIMS.md`, `state/AUDIT-CONTRACT.md`, `state/AUDIT-IDEA.md`, `state/MEMORY.md`; logs in `/tmp/opencode/audit/` (`public2-*`, `hosted-qa-final.log`, `final-zero-probe.log`, `final-secret-scan.log`).
