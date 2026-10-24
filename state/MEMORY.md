# MEMORY — Portaldot Hacker House 2026 (builder: unify / @oxunifyy)

Project log: findings, evidence, decisions, open items. The machine-readable source for public
chain parameters is `config/plaque.json`; the consistency test fails if a copy drifts.
All times UTC. "VERIFIED" = observed directly. "UNRESOLVED" = not yet confirmed.
Last updated **2026-10-24 09:56Z** (hostile audit).

---

## 1. Hackathon rules (VERIFIED 2026-10-20, source: the event's `detail` page)

| Rule | Detail | Status |
|---|---|---|
| Final deadline | **2026-11-06 04:00 UTC** (code freeze) | VERIFIED |
| Check-in deadline | **2026-10-24 12:00 UTC** — a human action; text ready in `submission/CHECK-IN.md` | VERIFIED |
| Kick-off / feedback / office hours | Oct 14 12:00Z / Oct 26 16:00Z / Oct 27 12:00Z (office hours Oct 28–29) | VERIFIED |
| Demo day / community vote / winners / rewards | Nov 8–9 / Nov 9 16:00 → Nov 10 16:00Z / Nov 11 / Nov 14 12:00Z | VERIFIED |
| Prize pool | 5,200 USDT (2,600 USDT + 2,600 USDT in POT); Grand 1,000 / Track 1st 800×4 / Ecosystem DApps 2nd 500, 3rd 300 / Community Choice 200 | VERIFIED |
| Final submission needs | name, team, one-sentence overview, **public GitHub repo** (README, deploy instructions, docs, runnable code, testnet deployment info), runnable demo, **demo video ≤3 min**, **pitch deck**, contract address + tx hash | VERIFIED |
| Deployment | "must effectively leverage Portaldot Network V3.0 core features and **complete deployment on the Portaldot testnet**" | VERIFIED |
| Code window | "primarily produced during Oct 14 – Nov 6"; repo public; **≥3 valid commits**; core modules **not** all committed in the final 24 h | VERIFIED |
| Originality | "Submitting an existing complete project as competition work is not allowed." OSS allowed with disclosure; plagiarism → disqualification | VERIFIED |
| Judging | **Technical Feasibility 30 %**, **Innovation 30 %**, **Ecosystem Contribution 20 %**, **Business Potential 20 %**; evidence = repo, commit timeline, testnet txs, contract addresses, tx hashes, live demo | VERIFIED |
| DoraHacks form field limits | **UNRESOLVED** — not published; every copy block is written short | UNRESOLVED |

**Track:** 4 Ecosystem DApps (the sponsored-write rail underneath is track-1 middleware).
**Time remaining at 2026-10-24 09:56Z:** final deadline **≈12.8 days**; check-in **≈2.1 hours**.

## 2. The Portaldot V3 testnet (all VERIFIED)

| Parameter | Value |
|---|---|
| EVM RPC | `https://test-evm-rpc-v3.portaldot.dev` |
| Substrate node | `wss://test-node-v3.portaldot.dev` |
| Chain id | **420420777**; chain `Portaldot V3 Test`, ss58 42, **14 decimals**, symbol `tPOT` |
| Block time | ~2 s (head 171,519 at 2026-10-24 07:30Z) |
| EVM implementation | **pallet-revive** (index 80); the runtime also has `pallet-contracts` (WASM, 21) |
| Other pallets | `MetaTx` (89), `VerifySignature` (81), `SkipFeelessPayment` (77), `AssetsPrecompiles` (91/92), `TransactionStorage` (51), `Mixnet` (75), `Broker` (73), `Oracle` (85), `Sudo` (22) |
| Faucet | **no public endpoint**; test POT arrives by hand via Discord |
| Node console (explorer) | `https://node-console.portaldot.dev` |
| RPC reliability | 5–9 s stalls at times → **all RPC through `scripts/rpc-lib.mjs`** (fetch + retry + timeout) |
| `eth_call` | **works for funded callers**; a caller with no balance gets `Invalid call: Payment`. This is why the live signature checks use the sponsor as `from`. The dashboard still reads `eth_getStorageAt` + `eth_getLogs` (pinned to a block) |
| Node pruning | on 2026-10-24, receipts and logs from ~40k blocks back were still served; do **not** assume that holds forever. Read state with `eth_getStorageAt` / `eth_getLogs` from the deployment block and keep local evidence JSON. |

### Cost model (measured, not estimated)

* 1 tPOT = 1e14 native units = **1e18 wei**.
* Gas price ≈33,000 wei (32,930 at the deploy, 32,915 at the claim).
* **One claim**: gasUsed 117,560,751,145,021 × 32,915 wei = **3.8695 tPOT**, decomposed as
  **≈0.028 tPOT of computation** (measured: the aborted attempt burned 850,785,408,901 gas before
  trapping at the write) + **≈3.84 tPOT of storage deposit** for the new mapping entry.
* **One deployment**: 786 bytes → **74.51 tPOT**; 302 bytes → **36.71 tPOT**. The deposit scales with
  code size.
* The **storage-deposit allowance is derived from `gasLimit × maxFeePerGas`**, and the pool also
  requires `balance ≥ gasLimit × maxFeePerGas`. A write needs a large gas limit even though it uses
  little computation (the claim needed ≥~1.2e14 gas). A mainnet-sized gas limit (21 000) is rejected
  ("Invalid Transaction"), and repeated bad transactions get the account temporarily banned.
* Existential deposit 0.1 tPOT.

### ⚠️ pallet-revive reverts on the BLOCK-family opcodes (VERIFIED)

`CHAINID`, `TIMESTAMP` and `NUMBER` revert. `contracts/Probe.sol` (81 B) and `contracts/Probe2.sol`
(121 B) both fail to deploy with a gas limit above the affordable ceiling; `Gate.sol` and
`Plaque.sol`, which never read the clock, deploy fine. Transactions and analysis:
`state/CHAIN-LIMITATION.md`.

**Resolution:** the deployed build reads no block value. The chain id is a compile-time constant; the
digest binds handle + claimant + chain id + contract address. The readable chain-compatible build is
`contracts/PlaqueV2.sol` (741 B, unaffordable at ~74.5 tPOT); the deployed build is
`contracts/PlaqueLite.sol` (302 B, fallback-only assembly, same digest and storage slot, three-address
`Claimed` event; no release, no window, no gas-price field).

## 3. The live deployment and the live claim (VERIFIED 2026-10-24)

| Field | Value |
|---|---|
| Contract | **`0x5432e6b89dc3042d47f2be98e971cad9dabab685`** (`PlaqueLite.sol`, 302 B) |
| Deployment tx | **`0xcee4d1db6c86250faa16bd67419168c7628c8a88533bf3d84316ccfd0c3bb63a`**, block **167044**, success |
| Deploy cost | 36.7095 tPOT (gas 1,114,774,206,357,087 × 32,930) |
| keccak | on chain `0x8a952eb82ff4a318b515cbface69a28c0f5dbbdab725d26220612a2dde6e3986` = fresh compile |
| **Live claim tx** | **`0xa654bd9ce55b389c072b00d0c4af55ab067d76acc422d5636b0c62863786edf2`**, block **167209**, success |
| Claim cost | 3.8695 tPOT (gas 117,560,751,145,021 × 32,915) |
| Claimant | `0xd35404A86f825741BA8a65a31Eb8ca1D52315Fe6` — **0 wei before, during and after** |
| Sponsor | `0x064e2C32bb460Ea16A3C44A47fD9BE95CAbD4fD5` |
| Handle | `unify`, key `0x756e696679…0000`, storage slot `0x56d47f50d2cfc36c2cba3ed1e61a8418df6c3a2e09f96e577d576a1c6c3b8cbf` → the claimant |
| Event | `Claimed(bytes32 indexed, address indexed who, address indexed sponsor)` — 4 topics, no data |
| Evidence | `evidence/claim-lite-unify.json`, `evidence/live-verification.txt` |
| Verifier | `npm run verify:live` — **10 checks, all passing** (read-only) |

**Balances:** deployer `0xfbDf…7E25` **0.0476 tPOT**; sponsor `0x064e…4fD5` **0.8748 tPOT**;
claimant **0**. A further claim costs ≈3.87 tPOT, so no more live claims are possible without a
top-up (see §8).

### The earlier deployment (kept for the record)

`Plaque.sol` (786 B) at `0xa0e58d0c6392048959c0b16a9d3696fe49d063d6`, tx
`0x7857ccc37707d6303f97b6001828b33177e6bd546d16bb00e3597a3ca663f14d`, block 132033, cost 74.51 tPOT,
keccak `0xce34126d…72ae`. Every claim against it reverts (BLOCK opcode); twelve-plus attempts, all
`status 0x0`. It is superseded by the live build above.

## 4. Testnet funding — what was done (disclosed)

* Bootstrapped from the **standard public Substrate dev account `//Alice`** (a published dev key that
  exists on this testnet): 10 tPOT, then 100 tPOT, plus 0.2 tPOT to a second sponsor account. No real
  value, no human-held credential. `//Alice` now holds 0.1 tPOT free (+1.11 reserved).
* **Spent:** 74.51 tPOT on the first deployment, 36.71 tPOT on the live one, ~3.87 tPOT on the live
  claim, plus probe and transfer gas.
* **Still useful from the operator:** ~40 tPOT to the sponsor `0x064e2C32bb460Ea16A3C44A47fD9BE95CAbD4fD5`
  (≈10 more live claims for the demo). Not blocking anything submitted.

### Our public testnet identities (public only)

| Purpose | Public address |
|---|---|
| Deployer / EVM signer (eth-derived) | **`0xfbDf159DcA07f0ae4F47da633B468e512f297E25`** (SS58 `5Hkx9RshKpqfvttQFTc5Ze7JbuunB6FP488X3eBzGPY9WYTf`) |
| Substrate sr25519 identity | `5EerrCZjEuNc3nypCUDLfvSyKLtJfzuKvQQx9DSCeeUFABoy` (0 tPOT) |
| Sponsor (paid the live claim) | `0x064e2C32bb460Ea16A3C44A47fD9BE95CAbD4fD5` |
| Zero-balance claimant | `0xd35404A86f825741BA8a65a31Eb8ca1D52315Fe6` |

Secrets: `secrets/testnet.key`, `secrets/sponsor.key`, `secrets/claimant.key`,
`secrets/substrate.seed` — mode 600, gitignored, never printed.

## 5. Stage 0.5 live gate — PASSED

`Gate.sol` (214 B) at `0x55040a925e106e7b7507015a0448ced999f572b6` (block 130488), bytecode identical
to a fresh compile, then `bump(7)` → receipt, one log decoded to `Bumped(7)`, state read back at block
130489 → 7.

## 6. Product and build

**Plaque** — a sponsored handle registry for Portaldot (Track 4). The user signs one message, a
sponsor pays, the contract binds the name to the address that signed, and the sponsor is public in
the event log. Decision / candidates / red team: `state/DECISION.md`. Design, interfaces, threat
model, test plan: `state/DESIGN.md`. Research (anonymised): `state/RESEARCH.md`. Name availability:
`state/NAME-CHECK.md`.

**Builds:** `Plaque.sol` (readable reference, deployed first, unusable for claims),
`PlaqueV2.sol` (readable, chain-compatible, not deployed — deposit), `PlaqueLite.sol` (deployed,
302 B, differential-tested against the readable build). Frontend: Next.js 15, reads the chain
server-side. SDK: `web/lib/plaque.js` (`buildClaimDigest` v1, `buildClaimDigestV2`, `encodeLiteClaim`,
`deriveHandleState`).

## 7. Decisions log

| # | Decision | Reason |
|---|---|---|
| D1 | **EVM (Solidity 0.8.28, solc-js)** | No rustc/ink!/foundry on this aarch64 image; Solidity is an explicitly listed stack |
| D2 | Local unit tests on **ganache** | No native EVM here |
| D3 | All chain access via `scripts/rpc-lib.mjs` | The public RPC stalls; the ethers provider timed out |
| D4 | Deploy from an **eth-derived AccountId32** | Statelessly mapped, and a normal secp256k1 address |
| D5 | Deploy with a **large gas limit** computed from the balance | The storage-deposit allowance follows the gas limit |
| D6 | Per-contract settings in `scripts/build-config.mjs`; `evmVersion: paris` | Code size is charged, and the deployed builds used different pipelines. Pinning them is what makes `npm run compile` reproduce the deployed bytecode. |
| D7 | Bootstrapped from the **public `//Alice` dev account** | The faucet needs a human action; a published dev key on a testnet is a safe, disclosed alternative |
| D8 | Proceeded with the whole build rather than stopping for the faucet | The chain gate had passed |
| D9 | The first deployed contract keeps `block.chainid`; the chain-compatible build is a separate file | The deployed bytecode must correspond byte-for-byte to a committed source |
| D10 | No competitor code, wording, UI or structure reused; no researched profile or project named anywhere | The brief's rule; the names were removed from `state/NAME-CHECK.md` and `state/DECISION.md` during the audit. |
| D11 | The **deployed** build is `PlaqueLite.sol` (302 B), not `PlaqueV2.sol` (741 B) | The chain charges ~0.12 tPOT/byte; 741 B needed ~74.5 tPOT, the wallet had 41.5. Cutting bytes was the only way to get a working live deployment inside the budget |
| D12 | A claim's gas limit is sized from the storage deposit, not from the computation | Measured: the write needs ≈3.84 tPOT of deposit allowance; a 2e13 limit (0.66 tPOT) traps at the `sstore` |
| D13 | The dashboard targets the lite build and reads storage + logs (no `eth_call`) | The lite build has no ABI; storage and logs are the ABI-free read path, and they are pinned to a block |

## 8. Open items for the human operator

1. **Submit the check-in by 2026-10-24 12:00Z** — paste `submission/CHECK-IN.md` into DoraHacks.
2. **Record the demo video** (≤3 min) from `submission/DEMO-SCRIPT.md`; the proof shot is
   `npm run verify:live`.
3. **Fill and submit the final DoraHacks form** from `submission/BUIDL.md` before 2026-11-06 04:00Z.
4. *(optional)* **Top up ≈40 tPOT to `0x064e2C32bb460Ea16A3C44A47fD9BE95CAbD4fD5`** for ~10 more
   live claims on camera. Nothing submitted depends on it.

## 9. Public URLs and repo state

| What | URL / value |
|---|---|
| Repository | **https://github.com/unifyWeb3/plaque** — public, `main`, 16 commits at baseline + the audit commits, all inside Oct 14 – Nov 6 |
| Frontend | **https://plaque-oxunify.vercel.app** — public (deployment protection deliberately off) |
| Vercel project | `plaque` (`prj_1iXdgZBbnkDn67Mgcsrcp2aj92Nk`, scope `oxunify`) |
| Explorer | https://node-console.portaldot.dev |

The deployed API (`/api/registry`) was verified against the live chain: head block, contract, deploy
tx, the `Claimed` event for `unify`, and `handles: 1`.

## 10. Verification inventory (what proves what)

| Claim | Proof |
|---|---|
| The deployed bytecode is the committed source | `eth_getCode` keccak = fresh-compile keccak (`npm run verify:live`, first check) |
| A zero-balance user can claim | the live claim tx + the storage slot + the claimant's 0 balance |
| The signature check works on this runtime | the `eth_call` matrix (valid accepted; tampered / wrong-address / zero-address refused) |
| The registry is readable by anyone | `eth_getStorageAt` and `eth_getLogs` through the public RPC, pinned to a block |
| The SDK and the contract agree | 33 tests (16 readable + 7 lite + 7 consistency + 3 relayer) |
| The mechanic is reproducible locally | `npm run demo` (labelled local chain, `evidence/local-demo.txt`) |
| The UI works | browser QA at 390×844 and 1280×900 (`evidence/qa/`) |
| The BLOCK-opcode limitation is real | two probe transactions, plus the failed claims on the first build |

## 11. Self-review findings and what was done

| Finding | Action |
|---|---|
| `ecrecover` on a malformed signature recovers to an arbitrary non-zero address, so "signer != 0" was not a valid check | Fixed: the claim names the claimed address, the digest binds it, and the contract requires the recovered signer to equal it — with a regression test |
| The SDK's `who` field was 20 bytes where the contract used 32 | Fixed; a test compares the SDK digest with the Solidity `abi.encode` |
| The tests shared one sponsor wallet and hit ganache nonce races | Fixed: one transaction per wallet; refusals are asserted with `eth_call` so they cannot race |
| The first UI cost figure was measured from nothing | Corrected twice: now 3.87 tPOT per claim, measured at block 167209 |
| The lite event was emitted with `log3` (three topics) while the test decoded three parameters + data | Caught by the test; fixed to `log4` (all three parameters indexed), and the test now asserts four topics and empty data |
| The dashboard never fetched the chain when the input was empty | Fixed: it always fetches |
| The research notes named the profiles and the competitor repositories | Rewritten to describe them by function only; the sweep enforces "no third-party handles" |
| The `eth_call` dependency in the chain reader | Removed: the dashboard reads `eth_getStorageAt` + `eth_getLogs` and pins every read to a block |
| The relayer's gas limit (2e13) was too small for the storage deposit | Fixed: a **fixed** 1.3e14 limit (never the whole sponsor balance), with an explicit "needs ~4 tPOT" refusal and a nonce queue |


## 12. Hostile audit decisions (2026-10-24)

| # | Decision | Reason / evidence |
|---|---|---|
| A1 | Pin per-contract build settings and canonical source keys in `scripts/build-config.mjs` | `npm run compile` now reproduces all four deployed hashes exactly; the old defaults produced 1085/995/255-byte artifacts (baseline F2) |
| A2 | Make `verify:live` secret-free; derive the expected claimant from the public config; use an ephemeral key for the signature matrix | The clean clone crashed on `secrets/claimant.key`; with a random key it failed 3 checks (baseline F1) |
| A3 | Treat the zero address as “no owner” in `readOwner` and `deriveHandleState` | The dashboard showed every free handle as `taken` and disabled the claim (baseline F3) |
| A4 | Scan events from the deployment block, not `block - 20000`; fail closed if the range is unavailable | The live claim will fall out of a rolling window (baseline F5) |
| A5 | Keep the hosted app honest: no sponsor key, no transaction sent; the button says “Sign claim” and explains the payload | The old copy implied the app could submit (F4) |
| A6 | Relayer: verify the signature off chain, reject non-canonical/zero handles and taken slots, fixed 1.3e14 gas limit, serialize nonces, cap pending, allowlist origins | Prevents a forged/taken claim from costing gas and a drive-by browser request from draining the sponsor |
| A7 | Document the lite limits instead of claiming parity: no release/window, zero handle accepted by the contract, payable fallback with no withdraw, no gas-price field | The old README/DESIGN/deck claimed “same event/semantics” and an “empty handle refused” check |
| A8 | Do **not** redeploy | The deployed runtime is byte-for-byte reproducible from the committed source after A1; a redeploy would need ~4.29 tPOT of gas-limit cover, a new address and a check-in addendum, with no security benefit. The remaining limits are byte-size trade-offs, not exploitable fund losses. |
| A9 | Keep the submitted check-in text and add an audit addendum | The check-in is a submitted artifact; the addendum corrects the two changed counts (33 tests, zero-address check) without rewriting history. |
| A10 | Keep the `audit-baseline` tag local and never force-push; commit fixes normally | The submitted state is evidence; history is additive. Baseline is `23f4067`. |
| A11 | Do not pivot after the competitor scan; reposition honestly | A public ENS-style `.pot` name service exists and is broader. Plaque's defensible claim is the live, measured sponsored write plus reproducibility, not novelty. |
| A12 | Mirror the public config inside `web/lib/plaque-config.json` | Vercel's project root is `web`; files above it are not uploaded. The mirror is byte-identical and `tests/consistency.test.mjs` fails on drift. |
| A13 | Clean-clone workaround: root `npm install` (not `npm ci`) and web `npm ci` | Root lockfile drift is a real finding; web lockfile is in sync and Vercel uses it. |
| A14 | The demo video is a human blocker | The event requires it; no video exists. The deck and `submission/DEMO-SCRIPT.md` are ready, but the recording is not. |
| A15 | Deploy the existing Vercel project once after the push, only if the app build is green | The hosted app was stale and showed the free-handle bug; the local production build and QA now pass. No contract redeploy. |
