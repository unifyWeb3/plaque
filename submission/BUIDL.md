# BUIDL submission text — Plaque

*Short by design: the DoraHacks form's field limits are not published, so every block below is
written to drop into a short field.*

## One-liner

**Claim your name on Portaldot without paying a thing — you sign, a sponsor pays, and the binding is
public and verifiable. It is already live on the V3 testnet.**

## Project name

Plaque

## Track

4 · Ecosystem DApps (consumer-facing application). The sponsored-write rail underneath it is
middleware (track 1).

## Problem

On Portaldot a brand-new account holds 0 tPOT, so it cannot make a single on-chain record — and
testnet POT is handed out by hand through a Discord ticket. Every newcomer is stuck at zero: they
cannot claim a name, register for a program, or leave any trace on the chain, and no dApp can ask
them to buy gas before they use it. The chain's runtime includes `MetaTx` and `VerifySignature`. Plaque does **not** use `MetaTx`: the
sponsored-write rail is an ordinary EIP-1559 transaction sent by a sponsor, which works on V3 today.
`MetaTx` integration is on the roadmap, not in the claim path.

## Solution

Plaque is a handle registry where the user never needs gas:

1. the user picks a handle and signs **one message** with their wallet;
2. a **sponsor** (a relayer, or the user's own wallet) submits the signed claim and pays;
3. the contract recovers the signature itself, binds the handle to the address that signed, and emits
   `Claimed(handle, who, sponsor)`. The registry is readable by anyone from the public RPC.

The claim digest binds the handle, the claimant, the chain id and the contract, so a signed claim
cannot be moved to another name, another address, another chain or another contract. The sponsor can
refuse to pay but cannot forge a claim or choose who receives a name.

## Technology

Solidity 0.8.28 (solc-js, no native toolchain needed) on the **Portaldot V3 testnet** EVM
(`pallet-revive`, chain id 420420777) · Next.js 15 / React 19 frontend · a dependency-free SDK
(handle normalisation, the claim digest, the UI state function) · a sponsor relayer in Node · **33
unit tests** on ganache · a read-only live verifier.

The deployed contract is **302 bytes**: a fallback-only assembly body with the same digest and the same
storage slot as the readable build. Its `Claimed(bytes32,address,address)` event is the three-address
form; the readable build also records `gasPrice`. That is a measured response to the chain, not
a style choice — it charges a deposit for every byte of code (36.7 tPOT for this build) and for every
storage entry it keeps (≈3.84 tPOT for one registry entry).

## What is live — verified, not promised

| | |
|---|---|
| Contract | **`0x5432e6b89dc3042d47f2be98e971cad9dabab685`** (`contracts/PlaqueLite.sol`) |
| Deployment | tx **`0xcee4d1db6c86250faa16bd67419168c7628c8a88533bf3d84316ccfd0c3bb63a`**, block **167044**, status success |
| Bytecode | 302 bytes, **byte-for-byte identical** to `npm run compile` of the committed source (canonical source key; see EVIDENCE) |
| Live sponsored claim | tx **`0xa654bd9ce55b389c072b00d0c4af55ab067d76acc422d5636b0c62863786edf2`**, block **167209** |
| The claimant | `0xd35404A86f825741BA8a65a31Eb8ca1D52315Fe6` — balance **0 wei before, during and after** |
| The sponsor | `0x064e2C32bb460Ea16A3C44A47fD9BE95CAbD4fD5` — paid 3.8695 tPOT |
| Verifier | `npm run verify:live` — **10 checks, all passing** against the public RPC |
| Frontend | **https://plaque-oxunify.vercel.app** — reads the chain server-side |
| Repository | **https://github.com/unifyWeb3/plaque** |

## The engineering story (short version)

1. The first build (`Plaque.sol`, 786 B) was deployed and byte-verified, but every claim reverted:
   this runtime reverts on the BLOCK-family opcodes, and that build read `block.chainid` inside the
   digest. Two probe contracts in the repository prove the limitation with transactions.
2. The chain-compatible rewrite (`PlaqueV2.sol`, 741 B) is committed and tested, but its code deposit
   (~74.5 tPOT) exceeded the funded balance.
3. So the same binding and verification semantics were rebuilt in a 302-byte fallback-only body
   (`PlaqueLite.sol`), which fits the deposit the wallet could pay — and it claimed live.
   `tests/plaque-lite.test.mjs` proves the two builds accept the same signatures and produce the same
   owner mapping. The lite build deliberately has no `release` and no validity window.

## Roadmap

1. A claim-then-confirm grace period, so a free name cannot be squatted.
2. A hosted sponsor with a per-developer budget settled in the chain's native `Assets` pallet, so
   sponsorship itself is on chain.
3. Release and signed handle transfers (in the readable build; they cost bytes this budget did not
   have).
4. A public indexer over the `Claimed` events, so any Portaldot app can resolve handles from the RPC.
5. Mainnet, with the cost model re-measured.
