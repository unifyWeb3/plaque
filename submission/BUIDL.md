# BUIDL submission text — Plaque

*Short by design: the DoraHacks form's field limits are not published, so every block below is
written to drop into a short field.*

## One-liner

**Claim your name on Portaldot without paying a thing — you sign, a sponsor pays the gas, and the
binding is permanent and public.**

## Project name

Plaque

## Track

4 · Ecosystem DApps (consumer-facing application). The sponsored-write rail underneath it is
middleware (track 1).

## Problem

On Portaldot a brand-new account holds 0 tPOT, so it cannot make a single on-chain record — and
testnet POT is handed out by hand through a Discord ticket. Every newcomer is stuck at zero: they
cannot claim a name, register for a program, or leave any trace on the chain, and no dApp can ask
them to buy gas before they use it. The chain's own runtime ships the machinery to fix this
(`MetaTx`, `VerifySignature`), and nobody has built the layer that uses it.

## Solution

Plaque is a handle registry where the user never needs gas:

1. the user picks a handle and signs **one message** with their wallet;
2. a **sponsor** (a relayer, or the user's own wallet) submits the signed claim and pays the gas;
3. the contract recovers the signature itself, binds the handle to the address that signed, and
   writes the sponsor, the gas price and the block into the event log.

The claim digest binds the handle, the claimant, the chain id and the contract, so a signed claim
cannot be moved to another name, another address, another chain or another contract. A write costs
about 0.01 tPOT of gas on the V3 testnet, so a sponsor can fund thousands of names with a single
tPOT — and every claim states publicly what it cost and who paid.

## Technology

Solidity 0.8.28 (solc-js, no native toolchain needed) on the **Portaldot V3 testnet** EVM
(`pallet-revive`, chain id 420420777) · Next.js 15 / React 19 frontend · a dependency-free SDK
(handle normalisation, the claim digest, the UI state function) · a sponsor relayer in Node · 16 unit
tests on ganache.

## What is live

* Contract **`0xa0e58d0c6392048959c0b16a9d3696fe49d063d6`**, deployed in block **132033**
  (tx `0x7857ccc37707d6303f97b6001828b33177e6bd546d16bb00e3597a3ca663f14d`).
* The deployed bytecode is **byte-for-byte identical** to a fresh compile of the committed source
  (keccak `0xce34126d8ac9c9a0c3d50c88fc72a52206a6763530cb55184e810ae9073472ae`).
* A live state-changing transaction from the same wallet (block 132718, 326,398,306,480 gas) and the
  measured cost of a write on this chain.
* A frontend that reads the chain through the public RPC and shows the registry and the sponsor
  ledger.
* **Known limitation, stated plainly:** this runtime reverts on the BLOCK-family opcodes, so the
  deployed build — which reads `block.chainid` inside the claim digest — cannot complete a claim on
  this chain. Two probe contracts prove the limitation; a chain-compatible build (`PlaqueV2.sol`,
  no `block.*` dependency) is committed and ready, and it needs ~71 tPOT to deploy, which the
  current testnet wallet does not have. This is the one thing still waiting on a testnet faucet
  top-up.

## Roadmap

1. Deploy the chain-compatible build on the V3 testnet (needs a faucet top-up) and point the
   dashboard at it.
2. A claim-then-confirm grace period, so a gasless claim cannot be griefed.
3. A hosted sponsor with a per-developer budget settled in the chain's native `Assets` pallet, so
   sponsorship itself is on chain.
4. Signed handle transfers, and a mainnet deployment with the cost model re-measured.
5. A public indexer over the claim events, so any Portaldot app can resolve handles from the RPC.
