# Add a sponsored (gasless) write to a Portaldot dApp

Plaque is the reference implementation of one reusable primitive: **a user with no POT signs a
message; a relayer verifies it off-chain and pays for the write; the chain records who signed.** The
handle registry is the example write, not the requirement.

This guide is the whole integration surface. It takes about ten minutes from a fresh clone, and the
read-only steps need no key or funds.

## 1. What you copy

| File | Purpose |
|---|---|
| `scripts/relayer-lib.mjs` | domain-bound digest, signature verification, canonical-handle check, fixed gas policy |
| `scripts/relayer-policy.mjs` | per-IP, per-origin, per-owner and global budgets; minimum-balance guard |
| `scripts/relayer.mjs` | the reference HTTP server: origin allowlist, serialized nonce queue, `POST /claim` |
| `config/relayer-policy.example.json` | the small config surface below |

The relayer never receives a private key. The user signs in their wallet; the relayer receives
`{handle, who, v, r, s}` and verifies the same digest the contract will verify.

## 2. The config surface

```json
{
  "perIp": { "max": 6, "windowMs": 60000 },
  "perOrigin": { "max": 6, "windowMs": 60000 },
  "perOwner": { "max": 3, "windowMs": 86400000 },
  "global": {
    "maxClaims": 20,
    "maxSpendWei": "80000000000000000000",
    "windowMs": 3600000
  },
  "minBalanceWei": "100000000000000000"
}
```

Copy `config/relayer-policy.example.json`, edit these limits, and pass it with
`--policy config/relayer-policy.json` (or `PLAQUE_POLICY`). This file contains only the limits.
The relayer reads the contract and chain id from `config/plaque.json` (`PLAQUE_CONTRACT` overrides
the address); the RPC endpoint is `PORTALDOT_RPC` or the same public endpoint. The gas limit is the
fixed `CLAIM_GAS_LIMIT` in `relayer-lib.mjs`. The reference HTTP server refuses a chain-id mismatch,
so it is testnet-only; for a local simulated chain use the local proof in section 6.

Run: `node --input-type=module -e "import { loadPolicyConfig } from './scripts/relayer-policy.mjs'; const p = loadPolicyConfig('config/relayer-policy.example.json'); console.log(p.perIp.max, p.perOwner.max, p.global.maxClaims);"`

## 3. Client: sign once, send nothing

```ts
import { AbiCoder, getBytes, keccak256, toUtf8Bytes, zeroPadBytes } from 'ethers';

const CHAIN_ID = 420420777n;
const CONTRACT = '0x5432e6b89dc3042d47f2be98e971cad9dabab685';

export async function signSponsoredClaim(signer: any, name: string) {
  const canonical = name.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9._-]{2,30}$/.test(canonical)) throw new Error('invalid handle');
  const handle = zeroPadBytes(toUtf8Bytes(canonical), 32);
  const digest = keccak256(AbiCoder.defaultAbiCoder().encode(
    ['uint256', 'bytes32', 'address', 'uint256', 'address'],
    [1n, handle, await signer.getAddress(), CHAIN_ID, CONTRACT],
  ));
  const signature = await signer.signMessage(getBytes(digest)); // EIP-191 personal-sign
  const claim = {
    handle,
    who: await signer.getAddress(),
    v: parseInt(signature.slice(130, 132), 16),
    r: '0x' + signature.slice(2, 66),
    s: '0x' + signature.slice(66, 130),
  };
  const res = await fetch('http://127.0.0.1:8787/claim', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(claim),
  });
  if (!res.ok) throw new Error((await res.json()).error);
  return res.json(); // { ok, hash, status, block }
}
```

The digest binds the handle, `who`, the chain id and the contract. A signature for another name,
address, chain or contract is refused before any gas is spent.

Run: `node --test tests/relayer.test.mjs` — the same digest and signature rules.

## 4. Relayer: verify before spending

```js
import { createSponsorPolicy, loadPolicyConfig } from './relayer-policy.mjs';
import { validateLiteClaim, claimGasLimit } from './relayer-lib.mjs';

const policy = createSponsorPolicy({ config: loadPolicyConfig('config/relayer-policy.json') });

// per request
const admitted = policy.admit({ ip, origin, owner: claim.who });
if (!admitted.ok) return { status: 429, error: admitted.reason };

// before signing the sponsor transaction
const { data } = validateLiteClaim(claim, { chainId, contract }); // throws on bad signature
const gasPrice = BigInt(await rpc('eth_gasPrice'));
const balance = await getBalance(sponsor.address);
const gasLimit = claimGasLimit({ gasPrice, balance, reserveWei: policy.config.minBalanceWei });
const reservation = policy.reserve({ costWei: gasLimit * gasPrice, balanceWei: balance });
if (!reservation.ok) return { status: 429, error: reservation.reason };

// the reference server serializes this step; never use a cached nonce for concurrent requests
const nonce = Number(await rpc('eth_getTransactionCount', [sponsor.address, 'pending']));
const raw = await sponsor.signTransaction({
  type: 2, chainId, nonce, to: contract, value: 0n, data,
  gasLimit, maxFeePerGas: gasPrice, maxPriorityFeePerGas: 0n,
});
const hash = await rpc('eth_sendRawTransaction', [raw]);
// on success policy.commit(reservation); on failure policy.release(reservation)
```

This is the order of operations, not a complete server. The runnable implementation is
`scripts/relayer.mjs`: it loads a `0600` sponsor key, serializes the nonce queue, and refuses a
chain-id mismatch. It is testnet-only; for a local simulated chain use section 6.

Run: `node --test tests/relayer.test.mjs tests/relayer-policy.test.mjs` — signature, budget and refusal rules.

`validateLiteClaim` rejects a zero `who`, a signature that recovers the zero address, a signature
for a different address, a non-canonical handle and the zero handle. The contract itself rejects a
zero `who` and a mismatched signature, but **it accepts the zero handle** if validly signed; that is
why the off-chain check is mandatory for this rail. A direct caller can still spend their own gas on
the zero handle; nobody can make the registry release it in this 302-byte build. The deployed
contract is frozen, so this is off-chain policy, not a contract guarantee.

## 5. Contract side: the reader

The deployed build is a `mapping(bytes32 => address)` at storage slot 0:

```solidity
mapping(bytes32 => address) public owners; // slot 0
event Claimed(bytes32 indexed handle, address indexed who, address indexed sponsor);

function ownerOf(bytes32 handle) external view returns (address) {
    return owners[handle];
}
```

Read it without the Plaque SDK:

```ts
import { concat, keccak256, zeroPadValue } from 'ethers';

const slot = keccak256(concat([handle, zeroPadValue('0x', 32)]));
const word = await provider.getStorage(CONTRACT, slot);
const owner = '0x' + word.slice(-40);
const claimed = /^0x0{40}$/i.test(owner) ? null : owner;
```

Run: `node scripts/verify-live.mjs` — reads the live storage slot and event.

The event signature hash is
`0x8428df912f4f2125b442b488df9c7260cb607246895bcd29f262ecca090b1538`; it has four topics
(`handle`, `who`, `sponsor`) and empty data. Query from the deployment block, not a rolling window.

## 6. Prove it locally (no key, no funds)

```bash
git clone https://github.com/unifyWeb3/plaque.git
cd plaque
npm ci                         # root tooling
npm run compile                # pinned solc builds
npm test                       # 41 tests, including Ganache and the sponsor kit
npm run demo                   # local sponsored write, labelled as a local chain
npm run verify:live            # read-only checks against the deployed testnet contract
```

The local test `the sponsor kit validates off-chain, then writes through a local simulated chain`
uses the same `validateLiteClaim`, `createSponsorPolicy` and `claimGasLimit` functions as the HTTP
relayer, then sends the claim on Ganache and reads the storage slot back. Its refusal cases have a
positive control: the valid claim is written before the duplicate-owner, bad-signature and zero-key
cases are rejected.

## 7. Limits you must design around

* **One relayer key.** It can only pay; if it leaks, its balance is drainable. Keep it in a
  gitignored `0600` file or a managed secret store, and cap its balance.
* **Per-IP and per-origin are not identity.** A non-browser client can spoof `Origin`; a public
  deployment must derive the IP from a trusted proxy and treat origin as a CSRF control, not a
  budget. Per-owner caps are bypassable with fresh keypairs. The global claim/spend budget is the
  real loss bound.
* **First-come names.** A free handle can be bound to any address that signs; the deposit is the
  deterrent. This build has no release or transfer.
* **Sponsor cost.** On this testnet one claim spends about 3.87 tPOT, almost all of it the chain's
  storage deposit. A 100 tPOT budget funds roughly 25 writes, not thousands.
* **No hosted sponsor in the web app.** The deployed frontend has no key and sends nothing; it
  produces the signed payload. Run the relayer locally or host it yourself.

## 8. What to change for your own write

Replace the handle digest and the lite calldata with your own domain-separated payload, keep the
same order: verify off-chain, reserve budget, serialize the nonce, submit, commit only on a successful
receipt. The registry reader is optional; the sponsored-write rail is the reusable part.
