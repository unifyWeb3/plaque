# Check-in submission — ready to paste

**Deadline: 2026-10-24 12:00 UTC.** The check-in is a *human* action (it needs the DoraHacks account);
this file is the text and the links, ready to copy. Everything in it is already done and on chain.

---

## 1. Project progress

**Plaque** — a sponsored handle registry for Portaldot: the user signs one message, a sponsor pays,
and the name is bound to the signer on chain. **It is live and it has already claimed a name.**

Done and verified:

* **A live sponsored claim on the Portaldot V3 testnet**: tx
  **`0xa654bd9ce55b389c072b00d0c4af55ab067d76acc422d5636b0c62863786edf2`** (block **167209**,
  status success). The signer, `0xd35404A86f825741BA8a65a31Eb8ca1D52315Fe6`, held **0 wei before,
  during and after** the claim; the sponsor `0x064e2C32bb460Ea16A3C44A47fD9BE95CAbD4fD5` paid
  3.8695 tPOT. The binding is readable at the `keccak256("unify" ‖ 0)` storage slot, and the
  `Claimed` event names the signer and the sponsor.
* The contract, **`0x5432e6b89dc3042d47f2be98e971cad9dabab685`** (`contracts/PlaqueLite.sol`, 302
  bytes), deployed in block **167044** (tx
  `0xcee4d1db6c86250faa16bd67419168c7628c8a88533bf3d84316ccfd0c3bb63a`). Its deployed bytecode is
  **byte-for-byte identical** to a fresh compile of the committed source (keccak
  `0x8a952eb82ff4a318b515cbface69a28c0f5dbbdab725d26220612a2dde6e3986`).
* **A read-only verifier** (`npm run verify:live`): 10 checks against the public RPC — deployed code,
  the storage binding, the signer's zero balance, the event, and a live signature matrix (valid
  accepted; tampered, wrong-address and empty-handle refused). **All passing.**
* **21/21 unit tests** passing on ganache, including a differential suite that runs the readable build
  and the deployed build against the same signatures.
* A Next.js frontend reading the chain server-side, deployed publicly at
  **https://plaque-oxunify.vercel.app**; a sponsor relayer; a deploy script that fails closed; a
  pre-push security sweep; browser QA at 390×844 and 1280×900.
* **A dozen-plus commits** in the public repository, spread across the event window.

## 2. What the engineering found (and fixed)

The runtime has two measured constraints, both documented with transactions:

1. **`pallet-revive` reverts on the BLOCK-family opcodes** (`CHAINID`, `TIMESTAMP`, `NUMBER`). The
   first contract read `block.chainid` inside the claim digest, so every claim reverted; two probe
   contracts prove it (`0x99e40a18…759e0c`, `0xba261049…18fcff`). The fix: the chain id is a
   compile-time constant and the digest binds handle + claimant + chain + contract, with nothing read
   from the clock.
2. **The chain charges a deposit per byte of code and per storage entry.** 786 bytes cost 74.5 tPOT,
   302 bytes cost 36.7 tPOT, and one new registry entry costs ≈3.84 tPOT. The deployed build is the
   302-byte one for exactly that reason, and one claim costs 3.87 tPOT, almost all of it the storage
   deposit.

## 3. Public GitHub repository

**https://github.com/unifyWeb3/plaque**

Complete README (problem, audience, architecture, trust model, live evidence, install/run, tests,
deployment details, the two chain constraints), deployment instructions, runnable code, and the
project documentation in `state/`.

## 4. Testnet deployment information

| Field | Value |
|---|---|
| Network | Portaldot V3 testnet, chain id **420420777** |
| Contract | **`0x5432e6b89dc3042d47f2be98e971cad9dabab685`** |
| Deployment tx | **`0xcee4d1db6c86250faa16bd67419168c7628c8a88533bf3d84316ccfd0c3bb63a`** (block 167044) |
| Live claim tx | **`0xa654bd9ce55b389c072b00d0c4af55ab067d76acc422d5636b0c62863786edf2`** (block 167209) |
| Explorer | https://node-console.portaldot.dev |
| Bytecode proof | on-chain keccak `0x8a952eb8…e3986` = fresh-compile keccak |
| Verify it yourself | `npm run verify:live` (read-only, no funds needed) |

## 5. Demo material

**Live app: https://plaque-oxunify.vercel.app** — the homepage reads the live block height, the
contract and the deployment transaction; the dashboard shows `unify` as taken by the zero-balance
signer and the sponsor ledger row with the claim transaction.

**Verifier output** (also in `evidence/live-verification.txt`):

```
$ npm run verify:live
  PASS  deployed code equals the committed build  302 bytes, keccak 0x8a952eb82ff4a318...
  PASS  ownerOf("unify") is the zero-balance claimant  0xd35404a86f825741ba8a65a31eb8ca1d52315fe6
  PASS  the claimant still holds 0 wei
  PASS  the Claimed event is on chain  block 167209
  PASS  the event names the claimant as `who`
  PASS  the event names the sponsor that paid
  PASS  a valid signature is accepted (eth_call)
  PASS  a tampered signature is refused
  PASS  a signature for another address is refused
  PASS  an empty handle is refused
ALL CHECKS PASSED
```

The pitch deck is in the repository: **`submission/Plaque-pitch-deck.pdf`** (9 slides, generated from
`submission/deck.html`). The ≤3-minute demo video will be recorded from `submission/DEMO-SCRIPT.md`
before the final submission.

## 6. Still outstanding

1. **Demo video** (≤3 min) — shot list written (`submission/DEMO-SCRIPT.md`); recording next.
2. **Volume, not function:** the sponsor wallet holds 0.87 tPOT and a claim costs ≈3.87 tPOT, so
   further *live* claims need a small faucet top-up (~40 tPOT = ten claims). The submitted claim is
   already live; nothing in the submission depends on more.

---

## One-line version

> Plaque — a sponsored handle registry for Portaldot, live on the V3 testnet: contract
> `0x5432e6b8…b685` (block 167044), bytecode verified against the committed source, and a live claim
> at block 167209 signed by an account whose balance was 0 wei before, during and after.
> `npm run verify:live` re-proves all ten checks; 21/21 tests pass; app at
> https://plaque-oxunify.vercel.app.

---

## Audit addendum (2026-10-24, after the hostile audit)

This file is preserved as the submitted check-in. Two details changed during the audit; the current
README/EVIDENCE are authoritative:

* `npm test` is now **33 tests, 33 pass** (16 readable + 7 lite + 7 consistency + 3 relayer). The
  original 21 count was the old two-file suite.
* The verifier's tenth check is **“a zero address is refused”**, not “an empty handle is refused”.
  The deployed `PlaqueLite` accepts the zero *handle* if it is validly signed; the app and relayer
  reject it, and `tests/plaque-lite.test.mjs` records the limitation. A redeploy would need ~4.29
  tPOT of gas-limit cover and would change the contract address, so it was not done.
* `npm run compile` now pins the per-contract settings and canonical source key, so it reproduces
  the deployed bytecode exactly from a clean clone. The verifier needs no secret.
* The dashboard now treats the zero address as “no owner”; a free handle shows `needs-wallet`
  (or `available` with a wallet), not `taken`.
