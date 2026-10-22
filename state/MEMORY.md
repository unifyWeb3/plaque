# MEMORY — Portaldot Hacker House 2026 (builder: unify / @oxunifyy)

Single source of truth. Findings, evidence, decisions, blockers.
All times UTC. "VERIFIED" = observed directly. "UNRESOLVED" = not yet confirmed.
Last updated **2026-10-21 20:10Z**.

---

## 0. Environment (VERIFIED 2026-10-20 22:45Z → 2026-10-21 20:10Z)

| Item | Value | Status |
|---|---|---|
| Working dir | `/root/hack` (repo root: `contracts/`, `web/`, `scripts/`, `tests/`, `state/`, `submission/`, `evidence/`, `secrets/`) | VERIFIED |
| OS / arch | Linux 6.17.0-Proot-Distro, **aarch64** | VERIFIED |
| Disk / RAM | 224G (93G free) / ~10.8GiB | VERIFIED |
| Node.js / npm / Git | v22.22.1 / 9.2.0 / 2.53.0 | VERIFIED |
| GitHub CLI | gh 2.46.0 — **authenticated as `unifyWeb3`** (gist, read:org, repo, workflow) | VERIFIED |
| Vercel CLI | 64.5.0 — **authenticated as `oxunifyy`** (scope `oxunify`, 14 existing projects) | VERIFIED |
| Go / Rust | **not installed** → no foundry, no ink!/cargo → the contract toolchain is solc-js | VERIFIED |
| Chromium | Playwright build 1248 present (`~/.cache/ms-playwright/chromium-1248/chrome-linux-arm64/chrome`) → browser QA works | VERIFIED |
| npm deps | `ethers@6`, `solc@0.8.28`, `ganache@7.9.2`, `@polkadot/api@16` + `keyring@13` + `util-crypto@13`; web: `next@15.5.28`, `react@19`, `playwright@1.49.1` | VERIFIED |
| npm quirk | `npm install` intermittently fails with a cacache ENOENT → use `npm install --cache /tmp/opencode/npmcache2`; the Next build intermittently fails with `EINVAL readlink` on this filesystem → **rebuild once** | VERIFIED |
| Filesystem quirk | `pkill` leaves an orphan `next-server`; use `pkill -f next-server` and `setsid nohup` to detach the dev server | VERIFIED |

## 1. Hackathon rules (VERIFIED 2026-10-20, source: the event's `detail` page)

| Rule | Detail | Status |
|---|---|---|
| Final deadline | **2026-11-06 04:00 UTC** (code freeze) | VERIFIED |
| Check-in deadline | **2026-10-24 12:00 UTC** | VERIFIED |
| Kick-off / feedback / office hours | Oct 14 12:00Z / Oct 26 16:00Z / Oct 27 12:00Z (office hours Oct 28–29) | VERIFIED |
| Demo day / community vote / winners / rewards | Nov 8–9 / Nov 9 16:00 → Nov 10 16:00Z / Nov 11 / Nov 14 12:00Z | VERIFIED |
| Prize pool | 5,200 USDT (2,600 USDT + 2,600 USDT in POT); Grand 1,000 / Track 1st 800×4 / Ecosystem DApps 2nd 500, 3rd 300 / Community Choice 200 | VERIFIED |
| Final submission needs | name, team, one-sentence overview, **public GitHub repo** (README, deploy instructions, docs, runnable code, testnet deployment info), runnable demo (web/DApp link or clear local instructions), **demo video ≤3 min (public link)**, **pitch deck (PDF or public link)**, contract address + tx hash | VERIFIED |
| Deployment | "must effectively leverage Portaldot Network V3.0 core features and **complete deployment on the Portaldot testnet**" | VERIFIED |
| Code window | "primarily produced during Oct 14 – Nov 6"; repo public; **≥3 valid commits**; core modules **not** all committed in the final 24 h | VERIFIED |
| Originality | "Submitting an existing complete project as competition work is not allowed." OSS allowed with disclosure; plagiarism → disqualification | VERIFIED |
| Judging | **Technical Feasibility 30 %**, **Innovation 30 %**, **Ecosystem Contribution 20 %**, **Business Potential 20 %**; evidence = repo, commit timeline, testnet txs, contract addresses, tx hashes, live demo | VERIFIED |
| Tech stack cues | Rust / ink!, Solidity, Web3 frontend; tags Blockchain, Rust, Ink!, solidity, portaldot | VERIFIED |
| Post-event support | the Ecosystem Foundation's long-term programme (mainnet migration, subsidies, tech advisory, exposure, growth, campaigns, gas/liquidity incentives, listing); non-winners eligible | VERIFIED |
| DoraHacks form field limits | **UNRESOLVED** — not published; the build form needs a login. Mitigation: every copy block is short | UNRESOLVED |
| Team-size cap | none stated | VERIFIED |
| Existing submissions | the event's build list is "under organizer review" → **no competitor submissions publicly visible** | VERIFIED 2026-10-20 |

**Tracks:** 1 Modular Cloud & Middleware · 2 Multi-Chain & Cross-Chain Infra · 3 Node Operations & Tooling · 4 Ecosystem DApps (chosen: **4**).

**Time remaining at 2026-10-21 20:10Z:** final deadline **≈15.3 days**; check-in **≈2.7 days** (the binding near-term constraint).

## 2. The Portaldot V3 testnet (all VERIFIED)

| Parameter | Value |
|---|---|
| EVM RPC | `https://test-evm-rpc-v3.portaldot.dev` (also `/v1`) |
| Substrate node | `wss://test-node-v3.portaldot.dev` |
| Chain id | **420420777** (`eth_chainId`, `net_version`, the runtime constant `revive.chainId`) |
| Chain | `Portaldot V3 Test`, ss58 prefix 42, **14 decimals**, symbol `tPOT`, runtime `portaldot-v3` specVersion 3002 |
| Block time | ~2 s (block 123 706 @ 00:05Z → 135 399 @ 20:00Z) |
| EVM implementation | **pallet-revive** (index 80) — *not* Frontier's pallet-evm; the runtime also has `pallet-contracts` (WASM, index 21) |
| Other pallets | `MetaTx` (89, gasless meta-tx), `VerifySignature` (81), `SkipFeelessPayment` (77), `AssetsPrecompiles` (91/92), `TransactionStorage` (51), `Mixnet` (75), `Broker` (73), `Oracle` (85), `Sudo` (22) |
| `MetaTx.dispatch` | takes `(metaTx: PalletMetaTxMetaTx, metaTxEncodedLen: u32)`; `PalletMetaTxMetaTx` = `{call, extensionVersion, extension}` — i.e. a whole signed extrinsic. **Not used**: reverse-engineering the signing format was too risky for the budget |
| Faucet | **no public endpoint** (all faucet/docs/api/explorer subdomains are NXDOMAIN; no `faucet_*` RPC; the node console has no faucet UI). Test POT is distributed by hand via Discord |
| Node console (explorer) | `https://node-console.portaldot.dev` → HTTP 200 SPA, `env-config.js` empty; its guessed API paths return the SPA |
| RPC reliability | 5–9 s stalls at times; the ethers provider timed out → **all RPC goes through `scripts/rpc-lib.mjs` (fetch + retry + timeout)** |
| `eth_call` | **currently unusable on the public node**: every call answers "Invalid call: Payment" (verified with four `from` accounts, two gas values, a view call and a state-changing call). The dashboard therefore reads `eth_getStorageAt` and `eth_getLogs` |
| Node pruning | receipts disappear quickly: the deployment receipt of block 132 033 was already gone by block ~135 000 |
| EVM activity before this build | **0 transactions in the 1 500 blocks scanned**; one contract deployed by anyone else |

### Address model (VERIFIED against all 875 live mappings)
`pallet-revive`'s `AccountId32Mapper`: an AccountId32 whose last 12 bytes are `0xEE` is *eth-derived*
and statelessly mapped (its EVM address is its first 20 bytes); every other AccountId32 maps to
`keccak256(pubkey)[12..32]`. Our deployer is eth-derived, so it is an ordinary secp256k1 account
that MetaMask and ethers understand.

### The cost model (the single most important chain fact)
* 1 tPOT = 1e14 native units = **1e18 wei** (`nativeToEthRatio` = 10 000).
* A call costs ≈**0.01 tPOT** (326 398 306 480 gas × 35 880 wei = 1.171e16 wei).
* A **deployment** costs ≈**0.095 tPOT per byte of code** (786 bytes → 74.51 tPOT).
* The **storage-deposit limit is derived from the transaction's gas limit** → a deployment needs
  `gasLimit ≳ deposit`, and the pool also needs `balance ≥ gasLimit × maxFeePerGas`. A mainnet-sized
  gas limit (21 000) makes every transaction invalid ("Invalid Transaction", then "temporarily
  banned"). This chain needs ≈**1e12 gas units** per call.
* Existential deposit 0.1 tPOT. Typical account balances 1–10 tPOT; 127 accounts hold >100 tPOT;
  total issuance 20 060 265 tPOT.

### ⚠️ pallet-revive on V3 reverts on the BLOCK-family opcodes (VERIFIED)
`CHAINID`, `TIMESTAMP` and `NUMBER` revert. `contracts/Probe.sol` (81 B, `block.chainid`) and
`contracts/Probe2.sol` (121 B, `block.timestamp`/`block.number`) both fail to deploy, with a gas
limit above the affordable ceiling; `contracts/Gate.sol` (214 B) and `contracts/Plaque.sol` (786 B),
which never read the clock, deploy fine. Details and the transactions: `state/CHAIN-LIMITATION.md`.

**Consequence:** the first Plaque build (which put `block.chainid` in the claim digest) can never
complete a claim on this chain — twelve-plus sponsored attempts, all status `0x0`, while the identical
contract and client code pass all 16 tests on ganache. `contracts/PlaqueV2.sol` is the
chain-compatible build (chain id as a constant, the window enforced by the sponsor); it is 741 bytes
and needs ≈71 tPOT to deploy, and the wallet has 41.4 tPOT.

## 3. Testnet funding — what was done (disclosed)

* The official faucet needs a human action (a Discord ticket with the **SS58 address starting with
  5**). To avoid stalling, the throwaway wallets were bootstrapped with test-only tPOT from the
  **standard public Substrate dev account `//Alice`** (a published dev key, present on this testnet
  with a testnet balance): 10 tPOT first, then 100 tPOT, and 0.2 tPOT to a second sponsor account.
  ~32 tPOT was left in `//Alice` for other testnet users. No real value is involved and no
  human-held credential was used. Scripts: `scripts/probes/bootstrap-testnet-funds.mjs`,
  `topup-alice.mjs`, `consolidate.mjs`, `fund-sponsor.mjs`.
* **Still needed from the human operator:** ≈100 tPOT to the deployer address
  **`5Hkx9RshKpqfvttQFTc5Ze7JbuunB6FP488X3eBzGPY9WYTf`** (Discord → <https://discord.gg/portaldot> →
  ticket or DM `@titus242471`; DoraHacks admin `@Stella707827`; include a screenshot of the
  registration). Then `node scripts/deploy-any.mjs PlaqueV2 && node scripts/claim-plaque.mjs …`.

### Our public testnet identities (public only)
| Purpose | Public address |
|---|---|
| Deployer / EVM signer (eth-derived) | **`0xfbDf159DcA07f0ae4F47da633B468e512f297E25`** (SS58 `5Hkx9RshKpqfvttQFTc5Ze7JbuunB6FP488X3eBzGPY9WYTf`, 41.4 tPOT left) |
| Substrate sr25519 identity | `5EerrCZjEuNc3nypCUDLfvSyKLtJfzuKvQQx9DSCeeUFABoy` (0 tPOT) |
| Second sponsor | `0x064e2C32bb460Ea16A3C44A47fD9BE95CAbD4fD5` (0.1 tPOT) |
| Zero-balance claimant (the demo user) | `0xd35404A86f825741BA8a65a31Eb8ca1D52315Fe6` (0 tPOT — the point) |

Secret material: `secrets/testnet.key`, `secrets/sponsor.key`, `secrets/claimant.key`,
`secrets/substrate.seed` — all mode 600, all gitignored, never printed.

## 4. Stage 0.5 live gate — PASSED

`contracts/Gate.sol` (214 B) deployed as `0x55040a925e106e7b7507015a0448ced999f572b6` (block 130488),
bytecode identical to a fresh compile, then `bump(7)` → receipt, one log decoded to `Bumped(7)`, and
the state read back with `eth_getStorageAt` **pinned to block 130489** → 7.

## 5. Product and build

**Plaque** — a sponsored handle registry for Portaldot (Track 4). The user signs one message, a
sponsor pays the gas, the contract binds the name to the address that signed, and the sponsor, the
gas price and the block are public in the event log. Decision, candidates, scoring and the red team:
`state/DECISION.md`. Design, interfaces, threat model, test plan: `state/DESIGN.md`. Research and the
competitor map (names deliberately not recorded): `state/RESEARCH.md`. Name availability:
`state/NAME-CHECK.md`.

## 6. Decisions log

| # | Decision | Reason |
|---|---|---|
| D1 | **EVM (Solidity 0.8.28, solc-js)** | No rustc/ink!/foundry on this aarch64 image; Solidity is an explicitly listed stack; the EVM path is proven live |
| D2 | Local unit tests on **ganache** | No native EVM here |
| D3 | All chain access via `scripts/rpc-lib.mjs` | The public RPC stalls; the ethers provider timed out |
| D4 | Deploy from an **eth-derived AccountId32** | Statelessly mapped, and a normal secp256k1 address that MetaMask and ethers understand |
| D5 | Deploy with a **large gas limit** computed from the balance | The storage-deposit limit follows the gas limit; a mainnet-sized limit makes every tx invalid |
| D6 | Optimizer runs 1, `metadata.bytecodeHash: none`, `evmVersion: paris` | Code size is charged at ≈0.095 tPOT/byte |
| D7 | The testnet wallet was bootstrapped from the **public `//Alice` dev account** | The official faucet needs a human action; a published dev key on a public testnet is a safe, non-privileged, testnet-only alternative. Disclosed in §3 and in the README |
| D8 | Proceeded with the whole build rather than stopping for the faucet | The chain gate had passed; the only open item was a contract *size* budget, and the user's reply can arrive while the rest of the work is done |
| D9 | The deployed contract keeps `block.chainid`; the chain-compatible build is a **separate file** | The deployed bytecode must correspond byte-for-byte to a committed source, so the repository keeps both and explains the difference |
| D10 | No competitor code, wording, UI or structure was reused, and **no researched profile or project is named** anywhere in the repository, its commits, UI, docs or submission text | The brief's rule; enforced by `scripts/security-sweep.sh` |

## 7. Stage status

- [x] Stage 0.1 capability inventory
- [x] Stage 0.2 rule verification (only the form field limits remain UNRESOLVED)
- [x] Stage 0.3 time budget
- [x] Stage 0.4 chain go/no-go — **PASS**
- [x] Stage 0.5 wallet, funding path, tiny-contract live gate — **PASS**
- [x] Stage 1 field research (`state/RESEARCH.md`)
- [x] Stage 2 decision (`state/DECISION.md`)
- [x] Stage 3 design (`state/DESIGN.md`)
- [x] Stage 4 contracts + tests — 16/16 on ganache
- [x] Stage 5 self-review (see §9)
- [x] Stage 6 frontend — built, browser-QA'd at 390×844 and 1280×900, no layout problems
- [x] Stage 7 deploy + prove — deployed, bytecode-identical, live transaction, the limitation proved
- [x] Stage 8 judging simulation (`state/JUDGING.md`)
- [x] Stage 9 repository (6 commits), Vercel deployment, submission kit

## 7b. Public URLs (VERIFIED 2026-10-22)

| What | URL | State |
|---|---|---|
| Repository | **https://github.com/unifyWeb3/plaque** | public, `main`, 8 commits, all dated inside Oct 14 - Nov 6 |
| Frontend | **https://plaque-oxunify.vercel.app** | deployed, reachable (HTTP 200) without a login; the deployment protection was turned off deliberately so a judge can open it |
| Vercel project | `plaque` (id `prj_1iXdgZBbnkDn67Mgcsrcp2aj92Nk`, scope `oxunify`) | renamed from the CLI default `web` |
| Explorer | https://node-console.portaldot.dev | the official node console |

The deployed API was checked against the live chain: it returns the head block (142 868 at the time),
the contract address, the deployment transaction and the `ownerOf` slot of a handle.

## 8. Open items for the human operator

1. **Fund ≈100 tPOT to `5Hkx9RshKpqfvttQFTc5Ze7JbuunB6FP488X3eBzGPY9WYTf`** → then redeploy
   `PlaqueV2` and re-run the claim evidence (§3).
2. **Record the demo video** (≤3 min) from `submission/DEMO-SCRIPT.md`.
3. **Publish the pitch deck** (PDF) from `submission/PITCH.md`.
4. **Fill and submit the DoraHacks form** from `submission/BUIDL.md` (the operator submits).

## 9. Self-review findings (Stage 5) and what was done

| Finding | Action |
|---|---|
| `ecrecover` on a malformed signature recovers to an arbitrary non-zero address, so "signer != 0" was not a valid check | Fixed: the claim now names the claimed address, the digest binds it, and the contract requires the recovered signer to equal it (`bad signature`) — with a regression test |
| The SDK's `who` field was 20 bytes where the contract used 32 | Fixed and covered by a test that compares the SDK digest with the Solidity `abi.encode` |
| The tests shared one sponsor wallet and hit ganache nonce races | Fixed: every test gets its own funded sponsor; the suite now passes twice in a row with exit 0 |
| The UI showed "0.0004 tPOT per write", a figure measured from nothing | Corrected to ≈0.01 tPOT, measured from live receipts |
| The dashboard never fetched the chain when the input was empty, so the "empty registry" panel was showing stale state | Fixed: it always fetches, and the empty state is now a real state |
| The public RPC variable had a mixed-case name | Renamed to `NEXT_PUBLIC_PORTALDOT_RPC` |
| The research notes named the profiles and the competitor repositories | Rewritten to describe them by function only; the sweep now enforces a general "no third-party handles" rule |
| The `eth_call` dependency in the chain reader | Removed: the dashboard reads `eth_getStorageAt` + `eth_getLogs` and pins every read to a block |
