# Check-in submission — ready to paste

**Deadline: 2026-10-24 12:00 UTC.** The check-in is a *human* action (it needs the DoraHacks account);
this file is the text and the links, ready to copy.

---

## 1. Project progress

**Plaque** — a sponsored handle registry for Portaldot: the user signs one message, a sponsor pays the
gas, and the name is bound to the signer on chain.

Done and verified:

* a Solidity registry deployed to the **Portaldot V3 testnet** at
  **`0xa0e58d0c6392048959c0b16a9d3696fe49d063d6`**
  (tx `0x7857ccc37707d6303f97b6001828b33177e6bd546d16bb00e3597a3ca663f14d`, block 132033, status
  success), with the deployed bytecode **byte-for-byte identical** to a fresh compile of the
  committed source;
* a second, smaller contract deployed and fully exercised on the testnet (claim transaction, receipt
  event, state read back at a pinned block) — this is the live proof that the deployment and read
  path work;
* **16/16 unit tests** passing on ganache, covering the legitimate path and every refusal with a
  positive control;
* a Next.js frontend reading the chain through the public RPC, deployed and publicly reachable at
  **https://plaque-oxunify.vercel.app**;
* a sponsor relayer, a deploy script that fails closed on an unfundable deposit, and a pre-push
  security sweep;
* 10 commits in the public repository, all dated inside the event window.

## 2. Outstanding items

1. **One chain-level blocker, stated plainly.** The V3 runtime (`pallet-revive`) reverts on the
   BLOCK-family opcodes (`CHAINID`, `TIMESTAMP`, `NUMBER`). The first build used `block.chainid`
   inside the claim digest, so a claim on this chain reverts. Two probe contracts prove the
   limitation (`0x99e40a18…759e0c`, `0xba261049…18fcff`), and two contracts that never read the clock
   deploy fine.
   The chain-compatible build (`contracts/PlaqueV2.sol`, chain id as a constant, no `block.*`) is
   written, tested and one command from deployment; it needs **≈71 tPOT** for the code deposit
   (the chain charges ≈0.095 tPOT per byte of code), and the testnet wallet holds **41.5 tPOT**.
   A faucet top-up of ~100 tPOT to `5Hkx9RshKpqfvttQFTc5Ze7JbuunB6FP488X3eBzGPY9WYTf` unblocks it.
2. **Demo video** (≤3 min) — the shot-by-shot script is written (`submission/DEMO-SCRIPT.md`); the
   recording is next.
3. **Pitch deck** (PDF) — the one-page content is written (`submission/PITCH.md`).

## 3. Public GitHub repository

**https://github.com/unifyWeb3/plaque**

Complete README (problem, audience, architecture, trust model, what is verified live vs only tested
locally, deployment details, install/run, tests), deployment instructions, runnable code, and the
project documentation in `state/`. Ten commits, spread across the event window — not a final-day
dump.

## 4. Testnet deployment information

| Field | Value |
|---|---|
| Network | Portaldot V3 testnet, chain id **420420777** |
| Contract | **`0xa0e58d0c6392048959c0b16a9d3696fe49d063d6`** |
| Deployment tx | **`0x7857ccc37707d6303f97b6001828b33177e6bd546d16bb00e3597a3ca663f14d`** |
| Block | 132033 |
| Explorer | https://node-console.portaldot.dev |
| Bytecode proof | on-chain keccak `0xce34126d8ac9c9a0c3d50c88fc72a52206a6763530cb55184e810ae9073472ae` = fresh-compile keccak |

Live transaction from the same wallet (evidence the account can write on this chain):
`0x2658d4f3a93e43afd057257fdbfc218002c0b39e3cd4f87f2a74daf7927663ba` (block 132718).

## 5. Demo material

**Live demo: https://plaque-oxunify.vercel.app** — the homepage reads the chain and shows the live
block height, the contract and the deployment transaction; the dashboard derives every action from
the chain state.

The ≤3-minute demo video will be recorded from `submission/DEMO-SCRIPT.md` before the final
submission.

---

## One-line version

> Plaque — a sponsored handle registry for Portaldot. Deployed on the V3 testnet
> (`0xa0e58d0c6392048959c0b16a9d3696fe49d063d6`, block 132033), bytecode-verified against the
> committed source, 16/16 tests passing, frontend live at https://plaque-oxunify.vercel.app. One
> known chain limitation (the runtime reverts on BLOCK opcodes) is documented with probe
> transactions, and the chain-compatible build is ready — it needs a ~100 tPOT faucet top-up to
> deploy.
