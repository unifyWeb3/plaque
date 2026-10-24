# Evidence — Plaque

Everything below was produced on the live Portaldot V3 testnet or by a command in this repository.
The one local-chain item is labelled as such. Nothing is staged or hand-written.

## 1. The live registry (deployed and claimed)

| Field | Value |
|---|---|
| Chain | Portaldot V3 testnet, chain id **420420777** (`pallet-revive` EVM) |
| RPC | `https://test-evm-rpc-v3.portaldot.dev` |
| Contract | **`0x5432e6b89dc3042d47f2be98e971cad9dabab685`** — `contracts/PlaqueLite.sol` |
| Deployment tx | **`0xcee4d1db6c86250faa16bd67419168c7628c8a88533bf3d84316ccfd0c3bb63a`** |
| Block | **167044** |
| Status / gas used | `0x1` (success) / 1,114,774,206,357,087 gas |
| Deploy cost | **36.7095 tPOT** (gas 1.1148e15 × 32,930 wei) — the chain's code deposit |
| Deployed bytecode | **302 bytes** |
| keccak (on chain `eth_getCode`) | `0x8a952eb82ff4a318b515cbface69a28c0f5dbbdab725d26220612a2dde6e3986` |
| keccak (fresh compile of `contracts/PlaqueLite.sol`) | `0x8a952eb82ff4a318b515cbface69a28c0f5dbbdab725d26220612a2dde6e3986` — identical |
| Compiler | solc-js 0.8.28, evmVersion `paris`, optimizer on (runs 200), `metadata.bytecodeHash: ipfs`; the source key is canonicalised to the deployment path so the IPFS hash is reproducible |
| Deployer | `0xfbDf159DcA07f0ae4F47da633B468e512f297E25` (an eth-derived AccountId32: `H160 ‖ 0xEE×12`, so it is statelessly mapped and works with ordinary EVM tooling) |

## 2. The live sponsored claim

This is the product, end to end, on the real chain: a signer with **no balance at all** authorises a
claim, a different account pays for it, and the binding is written where anybody can read it.

| Field | Value |
|---|---|
| Claim tx | **`0xa654bd9ce55b389c072b00d0c4af55ab067d76acc422d5636b0c62863786edf2`** |
| Block | **167209** |
| Status / gas used | `0x1` (success) / 117,560,751,145,021 gas |
| Effective gas price | 32,915 wei |
| Cost | **3.8695 tPOT**, paid by the sponsor |
| Handle | `unify` → key `0x756e696679000000000000000000000000000000000000000000000000000000` |
| Claimant (signer) | `0xd35404A86f825741BA8a65a31Eb8ca1D52315Fe6` |
| Claimant balance before / after | **0 wei / 0 wei** |
| Sponsor (sender) | `0x064e2C32bb460Ea16A3C44A47fD9BE95CAbD4fD5` |
| Storage slot | `0x56d47f50d2cfc36c2cba3ed1e61a8418df6c3a2e09f96e577d576a1c6c3b8cbf` = `keccak256("unify" ‖ 0)` |
| Storage value (`eth_getStorageAt`, `latest`) | `0x000…000d35404a86f825741ba8a65a31eb8ca1d52315fe6` = the signer |
| Event | `Claimed(bytes32 indexed handle, address indexed who, address indexed sponsor)` with `who` = the signer, `sponsor` = the payer, log index 3 |
| Signature | an EIP-191 `personal_sign` over `keccak256(abi.encode(bytes32(1), handle, who, 420420777, contract))` |

### Re-check it yourself (read-only, no funds needed)

```
$ npm run verify:live
Plaque live verification - block 171462

  PASS  deployed code equals the committed build  302 bytes, keccak 0x8a952eb82ff4a318...
  PASS  ownerOf("unify") is the zero-balance claimant  0xd35404a86f825741ba8a65a31eb8ca1d52315fe6
  PASS  the claimant still holds 0 wei
  PASS  the Claimed event is on chain  block 167209
  PASS  the event names the claimant as `who`
  PASS  the event names the sponsor that paid
        tx 0xa654bd9ce55b389c072b00d0c4af55ab067d76acc422d5636b0c62863786edf2
        explorer https://node-console.portaldot.dev
  PASS  a valid signature is accepted (eth_call)
  PASS  a tampered signature is refused
  PASS  a signature for another address is refused
  PASS  a zero address is refused

ALL CHECKS PASSED
```

The last four checks run against **live state** with `eth_call`, so they prove the deployed contract's
signature verification on the real runtime (nothing is written): a valid signature is accepted, a
tampered one is refused, a valid signature reused for a different address is refused, and a zero
address is refused. The lite contract does accept the zero *handle* if it is validly signed; the app
and relayer refuse that key, and the limitation is recorded in `tests/plaque-lite.test.mjs`. Full output: `evidence/live-verification.txt`.

## 3. What one claim costs, and why

| Part | Cost | Evidence |
|---|---|---|
| Compute + signature verification | **≈0.028 tPOT** | the same call, sent with a gas limit too small for the storage deposit, burned 850,785,408,901 gas before it trapped at the write (tx `0xea9f3e05…0beb`, block 167084, status `0x0`) |
| Storage deposit held by the runtime for the new registry entry | **≈3.84 tPOT** | the successful claim used 117,560,751,145,021 gas × 32,915 wei = 3.8695 tPOT |
| **Total** | **3.8695 tPOT** | tx `0xa654bd9c…edf2` |

The deposit is not a fee: this chain charges a deposit for every storage entry it keeps, which is why
a claim costs far more than a transfer, and why the registry is built as small as it is.

## 4. The BLOCK-opcode limitation, and how it was resolved

The first build (`Plaque.sol`, 786 B) read `block.chainid` inside the claim digest, and every claim
reverted. Two probe contracts show why:

| Contract | Reads | Result | Transaction |
|---|---|---|---|
| `contracts/Probe.sol` (81 B) | `block.chainid` | **reverted** | `0x99e40a1842e242d63c68417b2a731af68efe65f4eac9630e2dc7c8c899759e0c` (block 133190) |
| `contracts/Probe2.sol` (121 B) | `block.timestamp`, `block.number` | **reverted** | `0xba2610496c3f9046aa29f9a1a4f42b9b0c3ca1af72fe5b741293951d3518fcff` (block 133151) |
| `contracts/Gate.sol` (214 B) | none | deployed | `0x55040a925e106e7b7507015a0448ced999f572b6` |
| `contracts/Plaque.sol` (786 B) | constructor: none; claim: `CHAINID` + `TIMESTAMP` | deployed, but claims revert | `0x7857ccc37707d6303f97b6001828b33177e6bd546d16bb00e3597a3ca663f14d` |

Both failing probes were given a gas limit above the affordable ceiling (1.15e15 gas), so the failure
was not a gas or fee problem; both failed inside the constructor, after ~5.9e11 gas. Twelve-plus
sponsored claim attempts against `Plaque.sol` all reverted with status `0x0`, while the identical
contract and client code pass every unit test on ganache.

That left the readable chain-compatible rewrite (`PlaqueV2.sol`, 741 B, no `block.*`), whose code
deposit (~74.5 tPOT) exceeded the funded balance. The resolution was to keep the binding and verification semantics and cut the
bytes: `PlaqueLite.sol` is 302 bytes, with the same digest and storage slot and the three-address
`Claimed` event, and it is the build that claimed live. `tests/plaque-lite.test.mjs` runs both builds
against the same signatures and asserts the binding and storage agree. The lite build deliberately
has no `release` and no validity window; the readable build's event also carries `gasPrice`.

### The first deployment (kept for the record)

| Field | Value |
|---|---|
| Contract | `0xa0e58d0c6392048959c0b16a9d3696fe49d063d6` (`contracts/Plaque.sol`, 786 B) |
| Deployment tx | `0x7857ccc37707d6303f97b6001828b33177e6bd546d16bb00e3597a3ca663f14d`, block 132033, status `0x1` |
| keccak (on chain) | `0xce34126d8ac9c9a0c3d50c88fc72a52206a6763530cb55184e810ae9073472ae` = fresh compile |
| Deploy cost | 74.51 tPOT |
| Live write from the same wallet | tx `0x2658d4f3a93e43afd057257fdbfc218002c0b39e3cd4f87f2a74daf7927663ba`, block 132718, 326,398,306,480 gas, 0.0117 tPOT |

## 5. The gate contract (a contract that does not read the chain clock)

`contracts/Gate.sol` (214 bytes) was deployed as `0x55040a925e106e7b7507015a0448ced999f572b6`
(tx `0xdb26a1035b50c11d8a6d5024621f7aa20ef0284f03f092b9540b6b66de1babb9`, block 130488) and then
called (`bump(7)`, tx `0xc6a2ca92ccca3e2c689d190b229cd2765aa8b60456bdd372d2d9e6bf0cf0d61e`, block
130489). The receipt carried one log, decoded by ABI to `Bumped(7)`, and the state was read back with
`eth_getStorageAt` **pinned to block 130489** → `7`. Its bytecode was byte-identical to a fresh
compile as well (keccak `0x2bd5f237864ce18ddea620f6bdfeffb0cb8956c0b69d24ac0d507232d6c967d3`).

## 6. The unit tests

```
$ npm test
# tests 33
# suites 0
# pass 33
# fail 0
# cancelled 0
# skipped 0
# todo 0
$ echo $?
0
```

`tests/plaque.test.mjs` (16) covers the readable build: the legitimate path, six refusals each with a
positive control, the digest against the Solidity encoding, the access control on `release`, the UI
state function, the error lists, and the wei→tPOT conversion. `tests/plaque-lite.test.mjs` (7) covers
the deployed build: its size, the shared digest scheme, the binding + four-topic event + zero-cost
claimant, five refusals checked against the same state, the event signature, cross-chain/cross-contract
refusals, the absence of `release`, and the zero-key limitation. `tests/consistency.test.mjs` (7)
checks the config/docs/bytecode/address consistency; `tests/relayer.test.mjs` (3) checks the pre-flight
signature, handle and gas-limit rules.

## 7. The local end-to-end demo (labelled: a local chain)

`npm run demo` runs the same mechanic on ganache with the readable build, so the mechanic can be
reproduced without a funded testnet wallet. Output: `evidence/local-demo.txt`. It is labelled as a
local chain in the script, the README and the output itself; it is not presented as testnet state.

## 8. The browser QA

`web/scripts/qa-final.mjs` (Playwright + Chromium) at 390×844 and 1280×900: no horizontal overflow,
an `h1` on every screen, and no app console errors. It also exercises the four states the baseline
got wrong: a free handle with no wallet (`needs-wallet`, not `taken`), a taken handle (`unify`),
a loading skeleton, an API 502 (error text, not an empty registry), and the sign-only pending flow
with a mock wallet (button `Signing…`, then the signed payload). Screenshots:
`evidence/qa/home-desktop.png`, `home-mobile.png`, `dashboard-desktop.png`, `dashboard-mobile.png`,
`live-dashboard-taken.png`, `dashboard-signed.png`.

## 9. Chain facts measured on the V3 testnet

| Fact | Value |
|---|---|
| EVM implementation | `pallet-revive` (pallet index 80) — the runtime also has `pallet-contracts` (WASM) |
| Other notable pallets | `MetaTx` (89), `VerifySignature` (81), `SkipFeelessPayment` (77), `AssetsPrecompiles` (91/92), `TransactionStorage` (51), `Mixnet` (75), `Broker` (73), `Oracle` (85) |
| Token | `tPOT`, **14 decimals**; 1 tPOT = 1e14 native units = **1e18 wei** (`nativeToEthRatio` = 10 000) |
| Gas price | ≈33 000 wei (base fee; 32,930 at the deploy, 32,915 at the claim) |
| Gas unit | ~1e12 gas units for a simple transfer (not mainnet's 21 000) |
| Code deposit | 74.5 tPOT for 786 bytes; 36.7 tPOT for 302 bytes |
| Storage deposit | ≈3.84 tPOT for one new 32-byte mapping entry (measured from the live claim) |
| Deposit limit | the node derives the storage-deposit allowance from `gasLimit × maxFeePerGas`, and also requires `balance ≥ gasLimit × maxFeePerGas`; a transaction that writes storage needs a large gas limit even though it consumes little computation |
| `eth_call` | works for funded callers; a caller with no balance gets `Invalid call: Payment`. The dashboard therefore reads `eth_getStorageAt` and `eth_getLogs` |
| BLOCK opcodes | `CHAINID`, `TIMESTAMP` and `NUMBER` revert — no contract may read the clock or the chain id at runtime |
| Address model | `pallet-revive`'s `AccountId32Mapper`: an AccountId32 whose last 12 bytes are `0xEE` is *eth-derived* and statelessly mapped; every other AccountId32 maps to `keccak256(pubkey)[12..32]` (verified against all 875 live mappings) |
| Accounts | 936; 935 funded; total issuance 20 060 265 tPOT; 127 accounts hold more than 100 tPOT |
| Existential deposit | 0.1 tPOT |
