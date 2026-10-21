# Stage 3 — Design (Plaque)

**Product:** Plaque — the sponsored handle registry for Portaldot. Anyone claims an on-chain name for free;
a sponsor pays the gas; the record is permanent, verifiable, and readable by anyone through the public RPC.

**Track:** 4 · Ecosystem DApps (consumer-facing application), with a middleware substrate that also belongs to
track 1 · Modular Cloud & Middleware.

---

## 1. Architecture and component responsibilities

| Component | Where | Responsibility |
|---|---|---|
| `Plaque.sol` | Portaldot V3 testnet EVM (pallet-revive) | Binds a 32-byte handle key to an address; verifies the claimer's ECDSA signature; refuses taken handles; lets the owner release; emits the sponsor + gas price for every claim |
| `packages/plaque-sdk` (in `web/lib/`) | Browser + Node | Canonical handle normalisation, digest construction, ABI, and the **pure state function** that drives the UI |
| Relayer (`scripts/relayer.mjs`) | Operator's machine | Submits a signed claim on the sponsor's behalf, paying the gas. Never sees the user's key; never fabricates a claim (the contract verifies the signature) |
| `web/` (Next.js) | Vercel | Homepage (pitch + live proof) and dashboard (live registry, claim flow, sponsored + self-sponsored paths) |

### Data flow of one sponsored claim
1. The user types a handle in the dashboard. The SDK normalises it (`lowercase`, `trim`, `[a-z0-9._-]`,
   3–31 bytes) and produces the 32-byte key (UTF-8, zero-padded).
2. The SDK builds the claim digest (see §3) and the browser asks the user's wallet to sign it
   (`personal_sign` over the 32-byte digest). **The user spends nothing and signs nothing but a message.**
3. The signed claim is handed to a sponsor (the relayer) as a JSON payload.
4. The relayer signs an ordinary EVM transaction with the sponsor key and calls `claim(handle, who, v, r, s,
   validUntil)` on the contract. The sponsor pays the gas.
5. The contract recomputes the digest from its own calldata, recovers the signer, and refuses unless
   `signer == who`. It then stores `ownerOf[handle] = who` and emits
   `Claimed(handle, who, sponsor=msg.sender, gasPrice=tx.gasprice, at=block.timestamp)`.
6. The dashboard reads `ownerOf(handle)` and the claim events, and shows the new entry.

## 2. What is on-chain vs off-chain

**On-chain (Portaldot V3 testnet):** the handle→owner binding, the claim counter, and the claim/release events
(including the sponsor address and the gas price the sponsor paid). The event log is the public ledger of
*who sponsored Portaldot's growth* and *what it cost*.

**Off-chain (never trusted, only relayed):** the signed claim payload (it is self-authenticating — the contract
checks it), the relayer, and the web UI. The sponsor pays gas directly to the chain; **no contract ever holds
user funds and no third party ever custodies anything** — there is no escrow, no bond, no arbitration and no
dispute resolution anywhere in the design.

**Trust model, stated plainly:**
- The contract trusts **nobody** except the ECDSA signature of the claimed address, checked against a digest
  that binds handle, address, chain id, contract address and expiry.
- The relayer is **untrusted**: it can drop a claim, reorder claims, or fail to pay — it cannot forge one, and
  it cannot bind a name to somebody else's address. A dropped claim is recoverable because the claim is just a
  signed message that anyone can re-submit before `validUntil`.
- The sponsor is the gas payer, nothing more. The UI never claims the sponsor "paid for the name": the sponsor
  paid **gas**; the name is free.
- The frontend is **untrusted** by the contract; the contract is the only source of truth for state, and the
  dashboard re-reads it from the chain.
- There is **one** trusted key in the whole system: the sponsor's relayer key, which only ever pays gas. It is
  held in a gitignored file with `chmod 600`, is never in the frontend, never in a commit and never in the
  Vercel configuration.

## 3. Contract interface

```solidity
struct Entry — not used; the registry is intentionally one mapping deep.

mapping(bytes32 => address) public ownerOf;   // handle key -> owner
uint256 public claimCount;                     // number of claims ever made
event Claimed(bytes32 indexed handle, address indexed who, address indexed sponsor,
              uint256 gasPrice, uint256 at);
event Released(bytes32 indexed handle, address indexed who);

function claim(bytes32 handle, address who, uint8 v, bytes32 r, bytes32 s, uint64 validUntil) external;
function release(bytes32 handle) external;
```

**Claim digest** (identical in Solidity, TypeScript and the tests):

```
TAG      = keccak256("Plaque Claim v1")            // 32-byte constant, verified by a test
digest   = keccak256(
              TAG
           ‖ handle       (32 bytes)
           ‖ who          (20 bytes)
           ‖ validUntil   (8 bytes, big-endian)
           ‖ chainId      (8 bytes, big-endian)
           ‖ contract     (20 bytes)
         )
```

The signature is an EIP-191 `personal_sign` over the 32-byte digest. The contract verifies
`ecrecover(keccak256("\x19Ethereum Signed Message:\n32" ‖ digest), v, r, s) == who` and, as a fallback for
wallets that sign raw digests, also accepts `ecrecover(digest, v, r, s) == who`.

**Refusals (each with a positive control in the test suite):**
| Condition | Error |
|---|---|
| handle is all zero | `empty handle` |
| `who` is the zero address | `zero address` |
| `block.timestamp > validUntil` | `claim expired` |
| the handle is already owned | `handle taken` |
| the recovered signer ≠ `who` | `bad signature` |
| `release` by a non-owner | `not the owner` |

**Why the digest binds these fields:** the handle and the address are what is being asserted; `validUntil`
stops a captured signature from being replayed later; `chainId` and the contract address stop a signature from
being replayed on another chain or another contract.

## 4. UI state function (single source of truth)

`deriveHandleState(entries, handle)` — one pure function in `web/lib/plaque.ts`, used by every screen:

| Input state | Output | UI |
|---|---|---|
| `ownerOf(handle) == 0` | `{ status: 'available', canClaim: true }` | claim button enabled |
| `ownerOf(handle) != 0` and `owner == connected wallet` | `{ status: 'owned', canClaim: false, owner }` | "you own this" + release button |
| `ownerOf(handle) != 0` and `owner != connected wallet` | `{ status: 'taken', canClaim: false, owner }` | claim button **disabled** — the contract would refuse |
| no wallet connected | `{ status: 'needs-wallet', canClaim: false }` | connect prompt |

The function is unit-tested against the contract's own refusal list (parsed from `contracts/Plaque.sol`) and
against the live contract on ganache, so the UI cannot offer an action the contract rejects.

## 5. Threat model

| Threat | Mitigation |
|---|---|
| Relayer binds a name to a third party | Signature recovered on-chain; `signer != who` → `bad signature` |
| Signature replay (same chain) | `validUntil` in the digest; the handle can only be claimed once |
| Signature replay (other chain / other contract) | `chainId` and `address(this)` in the digest |
| Handle front-running | Only the address's own key can bind it; a captured signature is bounded by `validUntil` |
| Invisible name squatting (a second key for the same display name) | Impossible without the owner's own signature: a squatter would have to sign for the squatted key |
| Relayer censorship | The claim is a portable signed message; any sponsor can re-submit it before `validUntil` |
| Sponsor takes the user's money | The sponsor only pays gas; the contract moves no user funds and holds none |
| UI lying about state | One pure state function, unit-tested against the contract's refusal list and the live contract |
| Deployed code ≠ repository code | Byte-for-byte comparison of `eth_getCode` with a fresh compile of the committed source, with keccak hashes recorded |

## 6. Deployment plan

- Chain: **Portaldot V3 testnet**, EVM RPC `https://test-evm-rpc-v3.portaldot.dev`, chain id **420420777**.
- Deployer: the eth-derived account `0xfbDf159DcA07f0ae4F47da633B468e512f297E25`
  (AccountId32 `H160 ‖ 0xEE×12`, statelessly mapped, normal secp256k1 key → works with MetaMask and ethers).
- Compiler: **solc-js 0.8.28**, `evmVersion: paris`, optimizer on, `metadata.bytecodeHash: none` — the chain
  charges a storage deposit of ≈0.157 tPOT per byte of code, so code size is a first-class constraint.
- **Gas limit rule (measured, not guessed):** Portaldot derives the storage-deposit limit from the transaction's
  gas limit, so the deploy transaction must use a gas limit large enough to cover the deposit
  (`gasLimit × gasPrice ≳ deposit`) while the pool requires `balance ≥ gasLimit × maxFeePerGas`. The deploy
  script computes both bounds and fails closed if they cannot be satisfied.
- After deployment: retrieve the bytecode, compare it with a fresh compile, run the legitimate path
  (claim → event → read back), pin the reads to an explicit block number, and record every hash.

## 7. Test plan

Local (ganache, pure-JS EVM) — `node --test`:
1. the full legitimate path: claim a free handle succeeds, the owner is stored, the event fires;
2. every refusal with a **positive control** (a valid claim succeeds, each invalid variant fails with the
   expected reason, and the valid case is re-run to prove the refusal was not caused by an unrelated error);
3. signature binding: a signature for handle A does not verify for handle B; a signature for another chain id,
   another contract or an expired window does not verify;
4. access control: only the owner can release; a non-owner release is refused;
5. duplicate/terminal states: claiming a taken handle is refused; after release it can be re-claimed;
6. malformed input: zero handle, zero address, empty/invalid signature, `v` outside {27,28};
7. the UI state function against the contract's parsed refusal list;
8. the digest construction against the Solidity implementation (same bytes, same hash) — the cross-check that
   makes the client/contract pair safe.

Live (Portaldot V3 testnet): the Stage-0 gate script already proves deploy → bytecode → call → receipt →
event → pinned state. The product deploy repeats it for `Plaque.sol` and additionally claims a handle and reads
it back at a pinned block.

## 8. Claims the product may and may not make

**May claim:** every handle is bound to the address that signed it; a claim is sponsored (the sponsor paid the
gas, the user paid nothing); the sponsor and the gas price of every claim are public in the event log; the
registry can be read by anyone through the public RPC; the deployed bytecode is identical to a fresh compile of
the committed source; the cost figures quoted are measured from real receipts.

**May not claim:** that the relayer is trustworthy or available; that a name is reserved off-chain; that the
sponsor "owns" the name or the user's account; that the registry replaces the Portaldot `Identity` pallet
(it is a *handle*, not a legal identity); that the product is audited; that anything works on mainnet.
