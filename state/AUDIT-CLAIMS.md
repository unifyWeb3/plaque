# Stage 6 — public claim table

Checked 2026-10-24 09:05Z. `PASS` means observed in this audit; `FAIL` means the claim is false or
the required artifact is missing; `BLOCKED` means an external action is required; `NOT VERIFIED`
means the check has not been run. No claim is marked PASS from a README statement alone.

| # | Public claim | Status | Exact evidence / correction |
|---|---|---|---|
| 1 | Live contract `0x5432e6b8…b685`, deploy tx `0xcee4d1db…bb63a`, block 167044 | **PASS** | `config/plaque.json`; `verify-live` block 171964; GitHub repo public. |
| 2 | Deployed bytecode is the committed 302-byte build | **PASS** | `verify-live`: raw 302 B, keccak `0x8a952eb8…3986`, normalized 249 B, equal=true. |
| 3 | A zero-balance signer claimed `unify`; a sponsor paid | **PASS** | Claim tx `0xa654bd9c…edf2`, block 167209, status 1; claimant `0xd354…5fe6` holds 0 wei; sponsor `0x064e…d4fD5` paid. |
| 4 | One claim costs 3.8695 tPOT | **PASS** | Gas 117,560,751,145,021 × 32,915 wei = 3.8695 tPOT; receipt. |
| 5 | ~0.028 tPOT computation + ~3.84 tPOT storage deposit | **PASS (derived)** | Aborted call tx `0xea9f3e05…0beb` burned 850,785,408,901 gas before the storage write; the remainder is the deposit. Split is an estimate, total is measured. |
| 6 | `Claimed(bytes32,address,address)` event names claimant and sponsor | **PASS** | Topic `0x8428df…1538`; `verify-live` decodes `who` and sponsor. |
| 7 | Secret-free verifier, 10 checks | **PASS** | `npm run verify:live` exit 0 at 09:31Z (block 172856), log `final-root-suite.log`; no key file. |
| 8 | 33 tests pass | **PASS** | `npm test` exit 0 at 09:31Z, 33/33; log `final-root-suite.log`. |
| 9 | Free handle is not shown as taken; claim is enabled only when eligible | **PASS** | `web/scripts/qa-final.mjs` at 09:55Z: `unify` → `taken`; `audit-free-1` → `needs-wallet`; no wallet → disabled. |
| 10 | Loading, empty/error, pending states fail closed | **PASS** | QA at 09:55Z: 4 skeletons; 502 shows error and not “registry empty”; pending shows `Signing…` then the signed payload. |
| 11 | 390×844 and 1280×900, no horizontal overflow, no app console errors | **PASS** | QA output at 09:55Z: overflow 0 at both sizes; no app console errors (only the expected 502 network line in the injected error test). |
| 12 | Relayer refuses bad origin, taken handle, and an unfunded sponsor without sending a tx | **PASS** | HTTP 403/400/400 at 08:44Z; zero-balance key; no tx hash in response. |
| 13 | Relayer cannot be drained with a whole-balance gas limit; fixed 1.3e14 limit | **PASS** | `scripts/relayer-lib.mjs`; `tests/relayer.test.mjs`; code review. A leaked key can still drain its balance. |
| 14 | RPC/chain mismatch fails closed | **PASS** | 09:02Z `PORTALDOT_RPC=http://127.0.0.1:8546 npm run verify:live` → exit 2, `RPC chain 1337 != config chain 420420777`. |
| 15 | The web config is one canonical file | **PASS** | `config/plaque.json` and `web/lib/plaque-config.json` byte-identical; `tests/consistency.test.mjs` deep-equal + malformed-config refusals. |
| 16 | Clean clone reproduces compile/tests/verifier | **PASS** | `/tmp/opencode/audit/plaque-final` at `fbf1a0f`: `npm install` exit 0, compile exit 0, 33/33 tests exit 0, verifier exit 0 on retry (first attempt hit an RPC IPv6/network error), web `npm ci`/typecheck/build exit 0, demo exit 0, sweep exit 0. |
| 17 | Hosted app is current | **FAIL** | `https://plaque-oxunify.vercel.app/` at 08:29Z still serves the old title and the old free-handle bug; redeploy pending. |
| 18 | Demo video (required by the event) | **FAIL** | No video exists; only `submission/DEMO-SCRIPT.md` and a generated deck. |
| 19 | The category is novel | **FAIL** | A public ENS-style `.pot` name service already exists (not named in this repo). Repositioned: no novelty claim; the claim is the live measured sponsored write and reproducibility. |
| 20 | `npm ci` reproduces the root install | **FAIL** | Root lockfile out of sync (`@polkadot/x-textdecoder@13.5.7`, `x-textencoder@13.5.7`); `npm install` works. Web `npm ci --dry-run` exits 0. |
| 21 | `npm run lint` is configured | **FAIL** | It prompts for ESLint config and exits 1; documented, not used by CI. |
| 22 | `AGENTS.md` exists | **FAIL** | No `AGENTS.md` anywhere in the repo. Not required by the event. |
| 23 | No secrets in tracked files or any ref | **PASS** | `npm run sweep` 09:34Z; all-ref `git grep` for private-key/token patterns returned 0 files; no tracked `secrets/`. |
| 24 | At least 3 commits in the Oct 14 – Nov 6 window; core not all in the final 24 h | **PASS** | 16 commits, 2026-10-21 00:40Z → 2026-10-24 01:31Z; all inside the window; core contracts/tests committed Oct 21. |
| 25 | Official rules re-read | **PASS** | DoraHacks detail page 08:28Z: check-in 2026-10-24 12:00Z, final 2026-11-06 04:00Z, demo video required, code window Oct 14–Nov 6, 168 hackers/28 builds. |
| 26 | Pitch deck PDF is current | **PASS** | 9 pages, 77,578 bytes, regenerated 09:29Z; text checked against the corrected claims. |
| 27 | Integration snippets work | **PASS** | 09:07Z: the `docs/INTEGRATION.md` read-owner snippet returned `0xd354…5fe6` and the event query returned 1 log at block 167209. |
| 28 | The deployed lite build has no release/window and accepts the zero key | **PASS (documented limitation)** | `tests/plaque-lite` zero-key and no-release refusals; README/UI say so. |
| 29 | No third-party project/person names in public docs | **PASS (manual)** | `grep` for the known names and the competitor names found none; `npm run sweep` does not check names, so this is manual. |
| 30 | Hosted app has no sponsor key and does not send a tx | **PASS** | `NEXT_PUBLIC_SPONSOR_URL` unset in the build; dashboard renders `Sign claim`, shows the payload, and explains it sends nothing. |

## Corrections already applied to public docs

* “21 tests” → 33; “empty handle is refused” → zero address is refused (check-in addendum only;
  the original submitted text is preserved).
* “same event/semantics” → lite event has no gas-price field; no release/window.
* “hosted app submits a claim” → it signs only; a sponsor is optional and not hosted.
* “Plaque.sol cannot claim” is stated; `PlaqueV2` is readable but not deployed.
* Cost top-up wording: one claim needs a 4.29 tPOT balance; ~3.87 tPOT is spent.
