# Plaque

**A sponsored handle registry for the Portaldot V3 testnet. You sign; a sponsor pays the gas; your
name is on chain forever.**

Built for the **Portaldot Hacker House 2026** — Track 4, *Ecosystem DApps*.

| | |
|---|---|
| Chain | Portaldot V3 testnet, chain id **420420777** (`pallet-revive` EVM) |
| Contract | **`0xa0e58d0c6392048959c0b16a9d3696fe49d063d6`** |
| Deployment tx | **`0x7857ccc37707d6303f97b6001828b33177e6bd546d16bb00e3597a3ca663f14d`** (block **132033**) |
| Bytecode | 786 bytes, **byte-for-byte identical** to a fresh compile of `contracts/Plaque.sol` |
| Explorer | <https://node-console.portaldot.dev> |
| Frontend | `web/` (Next.js 15, App Router) — live at **https://plaque-oxunify.vercel.app** |
| Repository | **https://github.com/unifyWeb3/plaque** |
| Tests | `node --test tests/` — **16 tests, 16 pass, exit 0** |

---

## 1. The problem, and who has it

Portaldot is a new chain with a new token. A brand-new account holds **0 tPOT**, so it cannot make a
single on-chain record — and testnet POT is handed out by hand through a Discord support ticket.
Every person who arrives at the Portaldot ecosystem is therefore stuck at zero: they cannot claim a
name, register for a program, or leave any trace of themselves on the chain, and no dApp can ask them
to buy gas before they use it.

The audience is exactly that group: people joining the Portaldot ecosystem (the ~143 hackers
registered for this hackathon, ecosystem newcomers, and builders shipping their first dApp) — plus the
operators who want a permissionless directory instead of a hand-maintained list.

## 2. The solution

**Plaque** is a handle registry where the *user* never needs gas:

1. The user picks a handle and signs **one message** with their wallet.
2. A **sponsor** (a relayer, or the user's own wallet) submits the signed claim and pays the gas.
3. The contract recovers the signature itself, binds the handle to the address that signed, and writes
   the sponsor, the gas price and the block into the event log. Anyone can read it back from the
   public RPC.

The chain's cost model makes the sponsored write tiny: a transaction on the V3 testnet costs about
**0.01 tPOT** of gas, so a sponsor can fund thousands of names with a single tPOT. The registry also
doubles as a cost ledger — every claim states publicly what it cost and who paid.

A *handle* is a 32-byte key: the UTF-8 name, zero-padded. The claim digest binds the handle, the
claimant address, the chain id and this contract, so a signed claim cannot be moved to another name,
another address, another chain or another contract.

## 3. Architecture and data flow

```
 browser (web/)                        sponsor (scripts/relayer.mjs)              Portaldot V3 testnet
 ─────────────────                     ────────────────────────────              ────────────────────
 user types "unify"                     watches for signed claims                Plaque.sol
      │                                        │                                     │
      │  buildClaimDigest()  (web/lib/plaque.js)                                       │
      │  wallet personal_sign  ──────────────────►  POST /claim {handle,who,v,r,s,…}    │
      │                                        │                                     │
      │                                        └── eth_sendRawTransaction ───────────►  claim()
      │                                                                                  │
      │  dashboard reads the chain (server side) ◄── eth_getLogs / eth_getStorageAt ────┘
```

* **On chain:** the handle→owner binding, the claim/release events, and therefore the public
  directory and the sponsor ledger. The contract holds **no funds** and mints nothing.
* **Off chain (untrusted, only relayed):** the signed claim payload, the relayer, and the web UI. The
  claim is self-authenticating — the contract verifies it — so a sponsor can drop, reorder or refuse
  a claim but never forge one.
* **One trusted key:** the sponsor's relayer key. All it can do is pay gas. It lives in a gitignored
  file with `0600` permissions and is never in the frontend, a commit, a build log or a deployment
  configuration.

### The contract

```solidity
mapping(bytes32 => address) public ownerOf;
event Claimed(bytes32 indexed handle, address indexed who, address indexed sponsor, uint256 gasPrice);
event Released(bytes32 indexed handle, address indexed who);
error Unavailable();  error ClaimExpired();  error BadSignature();  error NotOwner();

function claim(bytes32 handle, address who, uint8 v, bytes32 r, bytes32 s, uint64 validUntil) external;
function release(bytes32 handle) external;
```

Refusals, each paired with a positive control in the test suite:

| Condition | Error |
|---|---|
| handle empty or already owned | `Unavailable` |
| `who` is the zero address | `BadSignature` |
| the signature does not recover to `who` | `BadSignature` |
| the signed window has passed | `ClaimExpired` |
| `release` by a non-owner | `NotOwner` |

## 4. What is verified live, and what is only tested locally

**Verified on the live Portaldot V3 testnet (real transactions, real receipts):**

| Check | Evidence |
|---|---|
| Deployment | tx `0x7857ccc3…f14d`, block 132033, status `0x1`, gasUsed `0x75d881ebfdfbb` |
| Deployed bytecode = fresh compile | `eth_getCode` = 786 bytes; keccak on-chain == keccak fresh build = `0xce34126d8ac9c9a0c3d50c88fc72a52206a6763530cb55184e810ae9073472ae` |
| A state-changing transaction from the same wallet | tx `0x2658d4f3a93e43afd057257fdbfc218002c0b39e3cd4f87f2a74daf7927663ba`, block 132718, status `0x1`, gasUsed 326,398,306,480 |
| The cost of a write | 326,398,306,480 gas × 35,880 wei = 1.17e16 wei = **0.0117 tPOT** |
| The registry state is empty | `eth_getStorageAt` on the `ownerOf` slot of `unify` returns the zero word |
| A smaller contract that does not read the chain clock deploys fine | `contracts/Gate.sol` (214 bytes) deployed as `0x55040a925e106e7b7507015a0448ced999f572b6`; claim, receipt, `Bumped(7)` event and a state readback pinned to block 130489 — all verified |

**Tested locally (ganache, a pure-JS EVM — this machine has no Rust toolchain):** the whole contract
lifecycle, every refusal with a positive control, the digest construction, and the UI state function —
**16 tests, 16 pass, exit 0** (section 7).

### ⚠️ Known limitation: this runtime cannot complete a claim

`pallet-revive` on the V3 testnet **reverts on the BLOCK-family opcodes** (`CHAINID`, `TIMESTAMP`,
`NUMBER`). Two probe contracts prove it, and two contracts that never read the clock deploy fine:

| Contract | Reads | Result | Transaction |
|---|---|---|---|
| `contracts/Probe.sol` (81 B) | `block.chainid` | **reverted** | `0x99e40a1842e242d63c68417b2a731af68efe65f4eac9630e2dc7c8c899759e0c` (block 133190) |
| `contracts/Probe2.sol` (121 B) | `block.timestamp`, `block.number` | **reverted** | `0xba2610496c3f9046aa29f9a1a4f42b9b0c3ca1af72fe5b741293951d3518fcff` (block 133151) |
| `contracts/Gate.sol` (214 B) | none | deployed | `0x55040a925e106e7b7507015a0448ced999f572b6` |
| `contracts/Plaque.sol` (786 B) | none | deployed | `0x7857ccc37707d6303f97b6001828b33177e6bd546d16bb00e3597a3ca663f14d` |

The first Plaque build put `block.chainid` inside the claim digest, so **every claim reverts** on this
runtime (12+ sponsored attempts, all `status 0x0`), even though the identical contract and the
identical client code pass all 16 tests on ganache.

`contracts/PlaqueV2.sol` is the chain-compatible build: the chain id is a compile-time constant, the
signature window is enforced by the sponsor (the contract cannot read a clock), and the digest still
binds handle + claimant + chain id + contract address. It is 741 bytes and costs **≈71 tPOT** to
deploy — more than the 41.4 tPOT left in the testnet wallet, so it is committed and ready but **not
deployed**. See section 9 for the one-line funding request that unblocks it.

## 5. Trust model and limitations

* The contract trusts nobody except the ECDSA signature, checked against the address in the claim.
* The sponsor is untrusted: it can refuse to pay, reorder claims or go offline. It cannot forge a
  claim, and it cannot bind a name to somebody else's address. A dropped claim is recoverable: the
  claim is a signed message anybody can re-submit before `validUntil`.
* No contract ever holds user funds. There is no escrow, no bond, no arbitration and no dispute
  resolution anywhere in the design.
* The frontend is untrusted by the contract; the contract is the only source of truth, and the
  dashboard re-reads it from the chain.
* The hosted frontend has **no** relayer: the brief forbids putting a secret in deployment
  configuration, so the deployed app can read the chain, produce the exact signed payload and submit
  it from a wallet that holds tPOT. Running a sponsor is a local operator job
  (`npm run relayer`).
* A *handle* is a name, not a legal identity: it is not a replacement for Portaldot's `Identity` pallet.
* Not audited. Testnet only. No mainnet deployment. The gas-price and deposit figures are measured on
  the V3 testnet and will differ on mainnet.
* A gasless claim can be **griefed**: anyone can bind a free handle to an address nobody controls,
  because a malformed signature recovers to some arbitrary address. The cost is one sponsored write
  (≈0.01 tPOT). A claim-then-confirm grace period would fix it, but it did not fit this chain's
  contract deposit budget (≈0.095 tPOT per byte of code); it is on the roadmap.

## 6. Install and run

```bash
git clone https://github.com/unifyWeb3/plaque.git
cd plaque
npm install                     # toolchain: solc-js, ethers, ganache, @polkadot/api
npm run compile                 # compile the contracts with solc-js into build/
npm test                        # 16 unit tests on ganache

cd web
npm install
npm run dev                     # http://localhost:3000
```

Run a sponsor (a local operator job; the key never leaves the machine):

```bash
node -e "const {Wallet}=require('ethers'),fs=require('fs');fs.writeFileSync('secrets/sponsor.key',Wallet.createRandom().privateKey+'\n',{mode:0o600})"
node scripts/relayer.mjs --contract Plaque --port 8787
# then: export NEXT_PUBLIC_SPONSOR_URL=http://127.0.0.1:8787/claim   (before `next build`)
```

Deploy to the testnet (needs a funded wallet):

```bash
node scripts/deploy-any.mjs Plaque      # computes the gas limit from the balance, fails closed
node scripts/claim-plaque.mjs <contract> <deployTx> unify
```

### Environment variables (all public)

| Variable | Default | Meaning |
|---|---|---|
| `NEXT_PUBLIC_PLAQUE_CONTRACT` | `0xa0e58d0c6392048959c0b16a9d3696fe49d063d6` | the registry the dashboard reads |
| `NEXT_PUBLIC_PORTALDOT_RPC` | `https://test-evm-rpc-v3.portaldot.dev` | the public RPC |
| `NEXT_PUBLIC_SPONSOR_URL` | *(unset)* | a sponsor endpoint; without it the app hands the user the signed payload |

No secret is ever needed to build or serve the frontend.

## 7. Tests — actual results

The frontend is deployed at **https://plaque-oxunify.vercel.app** and reads the chain server-side;
it was opened in Chromium at 390×844 and 1280×900, with no layout problems and no console errors.


```
$ npm test
# tests 16
# suites 0
# pass 16
# fail 0
# cancelled 0
# skipped 0
# todo 0
$ echo $?
0
```

What the 16 tests cover (`tests/plaque.test.mjs`):

1. the SDK ABI is identical to the compiled artifact's ABI (and the parameter names match);
2. the SDK digest is keccak-correct and byte-identical to the Solidity `abi.encode` of the same fields;
3. handle normalisation and the key round-trip;
4. **the legitimate path** — a sponsored claim binds the handle to the signer and emits `Claimed`;
5. refusal: a taken handle — **with a positive control** (the first claim succeeds);
6. refusal: an expired claim — **with a positive control**;
7. refusal: the empty handle;
8. refusal: a signature from another key (and the claimed address does not match the signer);
9. refusal: a signature made for another handle;
10. refusal: a signature made for another chain id;
11. refusal: a signature made for another contract;
12. refusal: malformed signature components (`v`, `r`, `s`);
13. access control: only the owner can release, and the name can then be re-claimed;
14. the UI state function agrees with the contract (it never offers a claim the contract refuses);
15. every contract error is described by the SDK (the two lists cannot drift);
16. the wei → tPOT conversion matches the chain's ratio.

Browser QA (`web/scripts/qa-browser.mjs`, Playwright/Chromium): screenshots at 390×844 and 1280×900,
no horizontal overflow, an `h1` on every screen, a visible focus outline on the first tab stop, and
no console errors.

## 8. Repository map

```
contracts/     Plaque.sol (deployed) · PlaqueV2.sol (chain-compatible build) · Gate.sol, Probe*.sol (diagnostics)
web/           Next.js app: homepage, dashboard, chain reader, the shared SDK, the browser QA script
scripts/       compile · deploy · claim · relayer · chain probes (all read-only except the deployers)
tests/         the 16 unit tests
state/         the research, the decision, the design, the chain limitation, this project's memory
submission/    the BUIDL text, the demo script, the pitch outline, the pre-submission checklist
```

## 9. One thing I need from the operator (blocks the chain-compatible redeploy)

The V3 testnet charges roughly **0.095 tPOT per byte of deployed code**, and the wallet that
deployed `Plaque.sol` has **41.4 tPOT** left — not enough for the 741-byte chain-compatible build
(≈71 tPOT). The official Portaldot faucet is a manual Discord ticket, so this needs a human action:

> **Discord → <https://discord.gg/portaldot> → support ticket or DM admin `@titus242471`**
> (DoraHacks admin: `@Stella707827`), including
> **(a)** a screenshot of the hackathon registration and
> **(b)** the native POT address **`5Hkx9RshKpqfvttQFTc5Ze7JbuunB6FP488X3eBzGPY9WYTf`**
> (the deployer; ~100 tPOT is enough).

With that, `node scripts/deploy-any.mjs PlaqueV2 && node scripts/claim-plaque.mjs …` finishes the
job in a couple of minutes, and the redeployed contract is the one the dashboard and the SDK point
at.

## 10. Roadmap

* **Deploy `PlaqueV2`** on the V3 testnet (needs the funding above) and move the dashboard to it.
* **Claim-then-confirm**: a grace period that makes a gasless claim safe against name griefing.
* **A real sponsor service**: a hosted relayer with a per-developer budget, settled in the chain's
  native `Assets` pallet so sponsorship itself is on chain.
* **Handle transfers**: a signed handover, so a name can move without a release.
* **Mainnet**: a Portaldot mainnet deployment of the same contract, with the cost model re-measured.
* **Open the directory**: a public indexer over the claim events, so other Portaldot apps can resolve
  handles from the RPC.

---

Testnet only. No audited code, no real value, no mainnet deployment. Built by
[unify](https://x.com/oxunify) for the Portaldot Hacker House 2026.
