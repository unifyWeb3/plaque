# Claim table — final gates (2026-10-24)

**Status: 0 FAIL · 1 BLOCKED (human demo video) · 0 NOT VERIFIED.** Every row has a command,
transaction or log. Missing/unrun is never PASS. The public clone used for the clean-clone gates is
`8ff97b68a069599f8e8b37e0b91936e23b487d9c`; the final audit commit is docs-only.

| # | Claim | Status | Evidence (command / tx / log) |
|---|---|---|---|
| 1 | Live contract, deploy tx and block are real | **PASS** | `config/plaque.json`; `npm run verify:live` exit 0, block 178804; deploy tx `0xcee4d1db…bb63a`, block 167044. |
| 2 | Deployed bytecode is the committed 302-byte build | **PASS** | Public clone `npm run compile` exit 0 (PlaqueLite 302 B); verifier PASS “deployed code equals the committed build”, keccak `0x8a952e…3986`. |
| 3 | The live claim was signed by an account holding 0 | **PASS** | Verifier PASS “ownerOf(\"unify\") is the zero-balance claimant” and “the claimant still holds 0 wei”; tx `0xa654bd9c…edf2`, block 167209. |
| 4 | One claim costs ≈3.87 tPOT, mostly the storage deposit | **PASS** | Measured tx gas 117,560,751,145,021 × 32,915 wei = 3.8695 tPOT; compute-only aborted tx `0xea9f3e05…0beb`. |
| 5 | The event names the signer and the sponsor | **PASS** | Verifier PASS “the event names the claimant as `who`” and “the event names the sponsor that paid”; log index 3. |
| 6 | The live verifier passes all 10 checks | **PASS** | `npm run verify:live` exit 0, 2026-10-24T19:27–19:31Z, block 178804; log `public2-verify.log`. |
| 7 | The full suite passes | **PASS** | Public clone `npm test` exit 0, 41/41, 0 fail, 0 skipped, 2026-10-24T19:28Z; log `public2-test.log`. |
| 8 | Free-handle, loading, error and pending states are correct | **PASS** | Hosted `web/scripts/qa-final.mjs` exit 0, 2026-10-24T19:22Z: `needs-wallet` for a free handle, `taken` for `unify`, skeletons, 502 text, sign-only pending; log `hosted-qa-final.log`. |
| 9 | The relayer refuses bad claims before spending | **PASS** | `tests/relayer.test.mjs` 3/3; HTTP 2026-10-24T12:40Z: taken 400, origin 403, zero-balance 400; `tests/relayer-policy.test.mjs` 7/7. |
| 10 | Sponsor policy controls are implemented and tested | **PASS** | Per-IP/per-origin/per-owner HTTP 429 with positive first request; global claim/spend and minimum-balance tests with positive controls and window resets; `config/relayer-policy.example.json`. |
| 11 | Sponsor drain is bounded, not eliminated | **PASS** | Fixed `1.3e14` gas, balance+reserve guard, global claim/spend budget, body cap, serialized nonce; residual risk documented (one key, spoofable IP/origin, fresh-key owner bypass). |
| 12 | Zero ADDRESS, invalid signature and zero HANDLE are distinguished | **PASS** | `npm run probe:zero` exit 0, 6/6, block 178891, 2026-10-24T19:40Z: zero address refused, invalid signature refused, zero handle accepted by the frozen contract with signer as owner, state unchanged. |
| 13 | Root install is reproducible from the lockfile | **PASS** | Public clone `npm ci` exit 0, 2026-10-24T19:27Z; `package-lock.json` regenerated to match pinned deps; log `public2-ci.log`. |
| 14 | Web install, typecheck, lint and build pass | **PASS** | Public clone `npm ci` exit 0; `npm run typecheck` exit 0; `npm run lint` exit 0 (no warnings/errors); `npm run build` exit 0, 2026-10-24T19:31–19:34Z; logs `public2-web-*.log`. |
| 15 | Lint is configured and `AGENTS.md` exists | **PASS** | `web/.eslintrc.json`; `next lint` exit 0; `AGENTS.md` committed. |
| 16 | Vercel project root is `web` | **PASS** | `PATCH /v9/projects/prj_1iXdgZBbnkDn67Mgcsrcp2aj92Nk` 200; GET `rootDirectory: web`, 2026-10-24T12:45Z. |
| 17 | Hosted app is current and reads the live contract | **PASS** | Push-triggered production deployment `dpl_EtcdZMMUyLpzF7DtomUohmui2pUs` Ready 2026-10-24T19:19:56Z, 36 s; alias `https://plaque-oxunify.vercel.app`; hosted API block 178710, contract `0x5432e6b8…b685`; QA exit 0. |
| 18 | The integration kit is documented and locally tested | **PASS** | `docs/INTEGRATE.md`; public clone gates above; `tests/plaque-lite.test.mjs` test 8 validates, applies policy, writes on Ganache and reads the owner back, with refusals after the positive control. |
| 19 | The demo script fits ≤3 minutes and has a no-funds fallback | **PASS** | `submission/DEMO-SCRIPT.md`: 2:50 timed shots, exact commands, on-screen proof, rehearsal checklist, existing-claim fallback; no recording made. |
| 20 | Sponsor balance and top-up are stated exactly | **PASS** | Sponsor `0x064e…4fD5` holds 0.874819304188115062 tPOT (0 claims); live threshold 4.2561 tPOT at 31,970 wei (4.3055 at the 32,350 example); top up ≥3.3813 tPOT now, 5 tPOT recommended. |
| 21 | Official rules and track were re-read | **PASS** | DoraHacks detail 2026-10-24T19:41Z: deadline 2026-11-06 04:00 UTC; demo video required; Modular Cloud & Middleware track text; 53 builds/173 hackers; check-in deadline 2026-10-24 12:00 UTC already submitted. |
| 22 | Commit history and author are clean | **PASS** | 27 commits at `8ff97b6`, all `unify <unify@oxunify.xyz>`, 2026-10-21 → 2026-10-24; no force-push; final audit commit is docs-only. |
| 23 | No credentials are tracked or reachable from any ref | **PASS** | Final scan 2026-10-24T19:44Z: 109 tracked files, 3 refs, 27 commits; 0 secret paths, 0 private-key blocks, 0 matches for each local credential in the tree or history; no values printed. |
| 24 | Public docs contain no third-party project/person names | **PASS** | `npm run sweep` exit 0; generic competitor descriptions; removed project-specific naming from README, deck, submission and state notes. |
| 25 | The pitch no longer claims category novelty | **PASS** | README “What this is not”, PITCH differentiation, BUIDL limits and AUDIT-IDEA all state no novelty; the claim row was removed rather than reworded. |
| 26 | The deck is current and 9 pages | **PASS** | `submission/deck.html` 9 sections; regenerated PDF 9 page objects, 78,525 bytes, 2026-10-24T13:07Z; sponsored-write lead and 41/41 tests. |
| 27 | The public clone reproduces the documented path | **PASS** | `git clone --depth 1` of `https://github.com/unifyWeb3/plaque.git` at `8ff97b6`; root and web gates above; `npm run demo` and `npm run verify:live` pass. |
| 28 | A required ≤3-minute demo video exists | **BLOCKED** | No video file/link in the repository; this is a human recording action. The agent must not record or submit. Fallback and shot list are ready. |
