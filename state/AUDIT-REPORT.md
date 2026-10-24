# Plaque — hostile audit report

**When:** 2026-10-24 10:47Z. **Human submits; the agent did not submit.** Check-in 12:00Z; final 2026-11-06 04:00Z.

## 1. Verdict
**Ship the audit, not a new product.** The live sponsored claim and the 302-byte reproducible build are real. The category is not novel, the hosted app is now correct, and the required demo video is still missing.

## 2. Scope and method
All eight stages were run in order. Every check below is labelled PASS/FAIL/BLOCKED/NOT VERIFIED in `state/AUDIT-CLAIMS.md` with a command, tx or log. The submitted state and the existing claim tx were preserved; no history rewrite and no force-push.

## 3. Stage 1 — baseline
`audit-baseline` at `23f4067` (local tag, absent before). Clean clone: install exit 0; 21/21 tests exit 0; `verify:live` exit 1 (`ENOENT secrets/claimant.key`); with a temp key, 3 checks failed (bytecode, owner, event who). Browser QA found free handle `audit-free-1` shown as `taken`, claim disabled. Log: `state/AUDIT-BASELINE.md`.

## 4. Stage 2 — reproducibility
Per-contract settings and canonical source keys now reproduce the deployed runtimes exactly: Plaque 786 B, PlaqueV2 741 B, Gate 214 B, PlaqueLite 302 B. Live raw code 302 B, keccak `0x8a952eb8…3986`; normalized 249 B, equal=true. Seven divergence tests pin address, chain id, RPC, deposit cost, digest domain, storage slot, event topic and the web config mirror.

## 5. Stage 3 — security
Replay, cross-address, cross-chain, cross-contract, tampered, zero-address and short-calldata claims are refused, each with a positive control. Front-running cannot change `who`; malleability does not change authorization. The relayer refuses bad origin (403), taken handle (400) and an unfunded sponsor (400) without sending a tx; it uses a fixed 1.3e14 gas limit, serialised nonces, origin allowlist and a pending cap. Wrong RPC chain exits 2. Residual: the contract accepts the zero key; the lite fallback is payable with no withdraw.

## 6. Stage 4 — idea
A direct, broader ENS-style `.pot` name service is already public (not named in the repo). Plaque therefore claims no novelty; it claims a live measured sponsored write plus reproducibility. Do not pivot: adding resolver/profile/transfer now would be a worse copy. Details: `state/AUDIT-IDEA.md`.

## 7. Stage 5 — redeploy
**No contract redeploy.** The deployed code is already the committed source; a new address would invalidate claim tx `0xa654bd9c…edf2`. It is unfunded: sponsor 0.8748 tPOT; one claim needs a 4.29 tPOT balance and spends 3.8695 tPOT; a new 302-byte deploy needs ~36.7 tPOT. Decision: `state/AUDIT-REDEPLOY.md`.

## 8. Stage 6 — claims and UI
30 public claims audited in `state/AUDIT-CLAIMS.md`; 25 PASS, 5 FAIL, 0 BLOCKED, 0 NOT VERIFIED at the end. The zero-owner bug is fixed; the dashboard uses one pure state function, clears stale owner state, and shows `checking…` while reading. Loading, 502 error, pending and fail-closed config were exercised. Browser QA passed at 390×844 and 1280×900 with no overflow; the hosted app now serves the new title and correct free-handle state.

## 9. Stage 7 — rules and git
Official page checked 08:28Z: check-in 2026-10-24 12:00Z; final 2026-11-06 04:00Z; demo video required; code window Oct 14–Nov 6; 168 hackers, 28 builds. 20+ commits, 2026-10-21 00:40Z → 2026-10-24 10:50Z, author `unify <unify@oxunify.xyz>`; core contracts/tests committed Oct 21, not bulk in the final 24h.

## 10. Stage 8 — clean worktree
Public clone `https://github.com/unifyWeb3/plaque.git` at `f3eefa0` (10:34Z): `npm install` exit 0, compile exit 0, 33/33 tests exit 0, `verify:live` 10/10 exit 0 at block 173512, no secrets. Local clean clone also passed web `npm ci`, typecheck, build, demo and sweep. Secret scan across tracked files and all refs returned zero private-key/token files; no `secrets/` is tracked.

## 11. Commits and deployment
Additive audit commits after `23f4067` (build, web, relayer, docs); pushed to `3413b5e`. Vercel manual production deploy `dpl_AQv46Teudz3iweHGs58qVWe4fumd` is Ready at `https://plaque-oxunify.vercel.app` (CLI exited 1 on a status-poll network error; `vercel inspect` confirmed Ready).

## 12. Blockers and human actions
**Blocking:** record the required ≤3-minute demo video from `submission/DEMO-SCRIPT.md`; submit check-in before 12:00Z and final before 2026-11-06 04:00Z. **Manual:** set the Vercel project Root Directory to `web` (currently `.`; Git pushes trigger a failed build) or deploy from `web` with `vercel build --prod` + `vercel deploy --prebuilt --prod`. **Known findings:** root `npm ci` fails on lockfile drift (`npm install` works); `npm run lint` is unconfigured; no `AGENTS.md` exists.

## 13. Facts / judgment / uncertainty
**Facts:** on-chain tx/status, bytecode hashes, compile sizes, test and verifier outputs, git history and secret scan. **Judgment:** no contract redeploy; the idea is not novel; the audit is worth shipping as a small reproducible primitive. **Uncertainty:** the judge reaction to a crowded category; demo-video quality; RPC log retention; the Vercel Git root mismatch until a human changes it. Evidence: `/tmp/opencode/audit/*.log`, `state/AUDIT-BASELINE.md`, `state/AUDIT-CLAIMS.md`, `state/AUDIT-CONTRACT.md`, `state/AUDIT-IDEA.md`, `state/AUDIT-REDEPLOY.md`.
