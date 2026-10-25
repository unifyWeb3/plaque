# Claim table — re-run (2026-10-25)

**Status: 27 PASS · 1 BLOCKED (human demo video) · 0 FAIL · 0 NOT VERIFIED.** Every row has a
command, transaction or log. Missing/unrun is never PASS. Public HEAD for this re-run is
`44a5d2a9278153f197e6e065d451f61d02fae528`; 30 commits; all author `unify <unify@oxunify.xyz>`.

| # | Claim | Status | Evidence (command / tx / log) |
|---|---|---|---|
| 1 | Live contract, deploy tx and block are real | **PASS** | `npm run verify:live` exit 0, 2026-10-25T13:06Z, block 189295; contract `0x5432e6b8…b685`; deploy tx `0xcee4d1db…bb63a`, block 167044. |
| 2 | Deployed bytecode is the committed 302-byte build | **PASS** | Fresh clone `npm run compile` exit 0 (PlaqueLite 302 B); verifier PASS “deployed code equals the committed build”, keccak `0x8a952e…3986`. |
| 3 | The live claim was signed by an account holding 0 | **PASS** | Verifier PASS “ownerOf(\"unify\") is the zero-balance claimant” and “the claimant still holds 0 wei”; claim tx `0xa654bd9c…edf2`, block 167209. |
| 4 | One claim costs ≈3.87 tPOT, mostly the storage deposit | **PASS** | Claim receipt re-read 2026-10-25: gas 117,560,751,145,021 × 32,915 wei = 3.869512123938366215 tPOT; status 1. |
| 5 | The event names the signer and the sponsor | **PASS** | Verifier PASS “the event names the claimant as `who`” and “the event names the sponsor that paid”; log index 3. |
| 6 | The live verifier passes all 10 checks | **PASS** | `npm run verify:live` exit 0, 2026-10-25T13:06Z, block 189295; log `guide-check-20261025T125032Z/sections.log`. |
| 7 | The full suite passes | **PASS** | Fresh clone `npm test` exit 0, 41/41, 0 fail, 0 skipped, 2026-10-25T13:04Z. |
| 8 | Free-handle, loading, error and pending states are correct | **PASS** | Hosted `web/scripts/qa-final.mjs` exit 0, 2026-10-25T13:10Z: `needs-wallet` free, `taken` unify, 4 skeletons, 502 text, sign-only pending; log `hosted-qa-20261025.log`. |
| 9 | The relayer refuses bad claims before spending | **PASS** | Fresh clone `node --test tests/relayer.test.mjs` 3/3 exit 0; zero handle now refused before `handleNameFromKey`; prior HTTP 400/403/400 checks unchanged. |
| 10 | Sponsor policy controls are implemented and tested | **PASS** | Fresh clone `node --test tests/relayer.test.mjs tests/relayer-policy.test.mjs` 10/10 exit 0; per-IP/per-origin/per-owner/global/reserve refusals with positive controls and resets. |
| 11 | Sponsor drain is bounded, not eliminated | **PASS** | Fixed `1.3e14` gas, balance+reserve guard, global claim/spend budget, body cap, serialized nonce; residual risk documented (one key, spoofable IP/origin, fresh-key owner bypass). |
| 12 | Zero ADDRESS, invalid signature and zero HANDLE are distinguished | **PASS** | Fresh clone `npm run probe:zero` exit 0, 6/6, block 189385: zero address/invalid signature refused; zero handle accepted by frozen contract with signer as owner, state unchanged; app/relayer refuse it off-chain. |
| 13 | Root install is reproducible from the lockfile | **PASS** | Fresh clone `npm ci` exit 0, 2026-10-25T12:54Z, 453 packages; lockfile unchanged. |
| 14 | Web install, typecheck, lint and build pass | **PASS** | Fresh clone `web npm ci` exit 0; `npm run typecheck` 0; `npm run lint` 0 (no warnings/errors); `npm run build` 0, 2026-10-25T13:12Z. |
| 15 | Lint is configured and `AGENTS.md` exists | **PASS** | `web/.eslintrc.json` present; `next lint` exit 0; `AGENTS.md` present. |
| 16 | Vercel project root is `web` | **PASS** | Project `prj_1iXdgZBbnkDn67Mgcsrcp2aj92Nk` rootDirectory `web` (PATCH 200, prior GET); latest push deployed from `web`. |
| 17 | Hosted app is current and reads the live contract | **PASS** | Push `44a5d2a` Vercel status success 2026-10-25T13:09:15Z; alias `https://plaque-oxunify.vercel.app`; API block 189337, contract `0x5432e6b8…b685`; hosted QA exit 0. |
| 18 | The integration kit is documented and locally tested | **PASS** | Fresh clone `docs/INTEGRATE.md` sections 2–6 PASS; §3 exact TS snippet compiled and accepted by a local validating mock; §5 exact reader read `unify`; §4 runnable tests 10/10. |
| 19 | The demo script fits ≤3 minutes and has a no-funds fallback | **PASS** | `submission/DEMO-SCRIPT.md`: 2:50 timed shots, commands, proof, rehearsal checklist, existing-claim fallback; no recording made. |
| 20 | Sponsor balance and top-up are stated exactly | **PASS** | Sponsor `0x064e…4fD5` balance 0.874819304188115062 tPOT at block 189325; gas 31,145 wei; per-claim 4.04885 tPOT; threshold 4.14885; top-up one **3.274030695811884938**, two **7.322880695811884938** tPOT. |
| 21 | Official rules and track were re-read | **PASS** | DoraHacks detail 2026-10-24T19:41Z: deadline 2026-11-06 04:00 UTC; demo video required; Modular Cloud & Middleware track; check-in deadline 2026-10-24 12:00 UTC already submitted. |
| 22 | Commit history and author are clean | **PASS** | `git rev-list --count HEAD` = 30 at `44a5d2a`; every commit author `unify <unify@oxunify.xyz>`; no force-push. |
| 23 | No credentials are tracked or reachable from any ref | **PASS** | `npm run sweep` exit 0, 2026-10-25T13:17Z: 109 tracked files, 3 refs, 30 commits; 0 secret paths, 0 private-key blocks, 0 matches for each local credential; no values printed. |
| 24 | Public docs contain no third-party project/person names | **PASS** | `npm run sweep` exit 0; only this project's identity referenced; generic competitor descriptions. |
| 25 | The pitch no longer claims category novelty | **PASS** | README “What this is not”, PITCH differentiation, BUIDL limits and AUDIT-IDEA all state no novelty; claim row removed. |
| 26 | The deck is current and 9 pages | **PASS** | `submission/deck.html` 9 sections; `submission/Plaque-pitch-deck.pdf` 78,525 bytes, 9 page objects; sponsored-write lead and 41/41 tests. |
| 27 | The public clone reproduces the documented path | **PASS** | Fresh clone at `44a5d2a`; root `npm ci`/compile/test 41/41/demo/verify:live exit 0; web npm ci/typecheck/lint/build exit 0; sections 2–6 PASS. |
| 28 | A required ≤3-minute demo video exists | **BLOCKED** | No video file/link in the repository; this is a human recording action. The agent must not record or submit. Fallback and shot list are ready. |
