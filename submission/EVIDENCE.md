# Evidence — Plaque

Everything below was produced on the live Portaldot V3 testnet or by a command in this repository.
Nothing is staged, simulated or hand-written.

## Deployment

| Field | Value |
|---|---|
| Chain | Portaldot V3 testnet, chain id **420420777** (`pallet-revive` EVM) |
| RPC | `https://test-evm-rpc-v3.portaldot.dev` |
| Contract | `0xa0e58d0c6392048959c0b16a9d3696fe49d063d6` |
| Deployment tx | `0x7857ccc37707d6303f97b6001828b33177e6bd546d16bb00e3597a3ca663f14d` |
| Block | 132033 |
| Status | `0x1` (success) |
| Gas used | `0x75d881ebfdfbb` = 2,073,164,049,780,147 gas |
| Deployer | `0xfbDf159DcA07f0ae4F47da633B468e512f297E25` (an eth-derived AccountId32: `H160 ‖ 0xEE×12`, so it is statelessly mapped and works with ordinary EVM tooling) |
| Deployed bytecode | 786 bytes |
| keccak (on chain) | `0xce34126d8ac9c9a0c3d50c88fc72a52206a6763530cb55184e810ae9073472ae` |
| keccak (fresh compile of `contracts/Plaque.sol`) | `0xce34126d8ac9c9a0c3d50c88fc72a52206a6763530cb55184e810ae9073472ae` — identical |
| Compiler | solc-js 0.8.28, evmVersion `paris`, optimizer on (runs 1), `metadata.bytecodeHash: none` |
| Cost | 74.51 tPOT (the chain charges a code deposit proportional to the code size) |

## A live state-changing transaction from the same wallet

| Field | Value |
|---|---|
| Tx | `0x2658d4f3a93e43afd057257fdbfc218002c0b39e3cd4f87f2a74daf7927663ba` |
| Block | 132718 |
| Status | `0x1` |
| Gas used | 326,398,306,480 |
| Effective gas price | 35,880 wei |
| Fee | 1.171e16 wei = **0.0117 tPOT** — the measured cost of one write on this chain |

## The Stage-0 gate contract (a contract that does not read the chain clock)

`contracts/Gate.sol` (214 bytes) was deployed as `0x55040a925e106e7b7507015a0448ced999f572b6`
(tx `0xdb26a1035b50c11d8a6d5024621f7aa20ef0284f03f092b9540b6b66de1babb9`, block 130488) and then
called (`bump(7)`, tx `0xc6a2ca92ccca3e2c689d190b229cd2765aa8b60456bdd372d2d9e6bf0cf0d61e`, block
130489). The receipt carried one log, decoded by ABI to `Bumped(7)`, and the state was read back
with `eth_getStorageAt` **pinned to block 130489** → `7`. Its bytecode was byte-identical to a fresh
compile as well (keccak `0x2bd5f237864ce18ddea620f6bdfeffb0cb8956c0b69d24ac0d507232d6c967d3`).

## The BLOCK-opcode limitation (why the live claim path reverts)

| Contract | Reads | Result | Transaction |
|---|---|---|---|
| `contracts/Probe.sol` (81 B) | `block.chainid` | **reverted** | `0x99e40a1842e242d63c68417b2a731af68efe65f4eac9630e2dc7c8c899759e0c` (block 133190) |
| `contracts/Probe2.sol` (121 B) | `block.timestamp`, `block.number` | **reverted** | `0xba2610496c3f9046aa29f9a1a4f42b9b0c3ca1af72fe5b741293951d3518fcff` (block 133151) |
| `contracts/Gate.sol` (214 B) | none | deployed | `0x55040a925e106e7b7507015a0448ced999f572b6` |
| `contracts/Plaque.sol` (786 B) | none | deployed | `0x7857ccc37707d6303f97b6001828b33177e6bd546d16bb00e3597a3ca663f14d` |

Both failing probes were given a gas limit above the affordable ceiling (1.15e15 gas), so the failure
is not a gas or fee problem; both failed inside the constructor, after ~5.9e11 gas. Twelve-plus
sponsored claim attempts against the deployed `Plaque.sol` all reverted with status `0x0`, while the
identical contract and the identical client code pass all 16 unit tests on ganache.

## The unit tests

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

The run covers the legitimate path, six refusals each with a positive control, the digest
construction against the Solidity encoding, the access control on `release`, the UI state function
against the contract, the error lists, and the wei→tPOT conversion.

## The browser QA

`web/scripts/qa-browser.mjs` (Playwright + Chromium) at 390×844 and 1280×900: no horizontal overflow,
an `h1` on every screen, a visible 2 px focus outline on the first tab stop, and no console errors.
Screenshots: `evidence/qa/home-desktop.png`, `home-mobile.png`, `dashboard-desktop.png`,
`dashboard-mobile.png`.

## Chain facts measured on the V3 testnet

| Fact | Value |
|---|---|
| EVM implementation | `pallet-revive` (pallet index 80) — the runtime also has `pallet-contracts` (WASM) |
| Other notable pallets | `MetaTx` (89, gasless meta-transactions), `VerifySignature` (81), `SkipFeelessPayment` (77), `AssetsPrecompiles` (91/92), `TransactionStorage` (51), `Mixnet` (75), `Broker` (73), `Oracle` (85) |
| Token | `tPOT`, **14 decimals**; 1 tPOT = 1e14 native units = **1e18 wei** (`nativeToEthRatio` = 10 000) |
| Gas price | ≈35 880 wei (base fee) |
| Gas unit | ~1e12 gas units for a simple call (not mainnet's 21 000) |
| Deployment cost | ≈0.095 tPOT per byte of contract code |
| Storage-deposit limit | derived from the transaction's gas limit — a deployment needs `gasLimit ≳ deposit` |
| EVM activity before this build | 0 transactions in the 1 500 blocks scanned; one contract deployed by anyone else |
| `eth_call` | currently unusable on the public node (every call answers "Invalid call: Payment"), so the dashboard reads `eth_getStorageAt` and `eth_getLogs` instead |
| Address model | `pallet-revive`'s `AccountId32Mapper`: an AccountId32 whose last 12 bytes are `0xEE` is *eth-derived* and statelessly mapped; every other AccountId32 maps to `keccak256(pubkey)[12..32]` (verified against all 875 live mappings) |
| Accounts | 936; 935 funded; total issuance 20 060 265 tPOT; 127 accounts hold more than 100 tPOT |
| Existential deposit | 0.1 tPOT |
