# Reading and integrating Plaque

The live registry is one `mapping(bytes32 => address)` at storage slot 0 of
`0x5432e6b89dc3042d47f2be98e971cad9dabab685` on the Portaldot V3 testnet (chain id
`420420777`). You do not need our SDK to read it.

## Read an owner (TypeScript, ethers v6)

```ts
import { JsonRpcProvider, keccak256, concat, zeroPadValue } from 'ethers';

const RPC = 'https://test-evm-rpc-v3.portaldot.dev';
const CONTRACT = '0x5432e6b89dc3042d47f2be98e971cad9dabab685';

export async function ownerOf(name: string): Promise<string | null> {
  const key = '0x' + Buffer.from(name, 'utf8').toString('hex').padEnd(64, '0');
  const slot = keccak256(concat([key, zeroPadValue('0x', 32)]));
  const word = await new JsonRpcProvider(RPC).getStorage(CONTRACT, slot);
  const owner = '0x' + word.slice(-40);
  return /^0x0{40}$/i.test(owner) ? null : owner;
}
```

`getStorage` pins to the latest block; for a reproducible read, call
`eth_getStorageAt` with an explicit block number (see `web/lib/chain.ts`).

## Read the claims (TypeScript, ethers v6)

```ts
const topic = '0x8428df912f4f2125b442b488df9c7260cb607246895bcd29f262ecca090b1538';
const logs = await provider.getLogs({
  address: CONTRACT,
  fromBlock: 167044,          // deployment block; do not use a rolling window
  toBlock: 'latest',
  topics: [topic],
});
// topics[1] = handle, topics[2] = who, topics[3] = sponsor; data = 0x
```

## Verify a claim off chain (Node, ethers v6)

```ts
import { getBytes, verifyMessage, keccak256, AbiCoder } from 'ethers';

const digest = keccak256(AbiCoder.defaultAbiCoder().encode(
  ['bytes32', 'bytes32', 'address', 'uint256', 'address'],
  [1n, handle, who, 420420777n, CONTRACT],
));
const signer = verifyMessage(getBytes(digest), signature); // 65-byte 0x r‖s‖v
if (signer.toLowerCase() !== who.toLowerCase()) throw new Error('bad claim');
```

## Submit a claim (funded wallet, ethers v6)

The lite contract has no ABI. Calldata is exactly five 32-byte words:

```ts
import { concat, zeroPadValue } from 'ethers';

const data = concat([
  handle,                                  // bytes32
  zeroPadValue(who, 32),                   // address
  zeroPadValue('0x' + v.toString(16), 32), // uint8
  r,                                       // bytes32
  s,                                       // bytes32
]);
await signer.sendTransaction({
  to: CONTRACT,
  value: 0n,
  data,
  gasLimit: 130_000_000_000_000n,
});
```

A fixed `gasLimit` of `1.3e14` covers the measured storage deposit. The transaction **must**
send `value: 0`; the lite fallback is payable but has no withdraw, so any tPOT sent is stuck.

## What this does not provide

No reverse lookup, no profile records, no transfer, no release in the deployed build, no
renewal, and no on-chain Unicode normalisation (ASCII only, 3–31 bytes). A resolver/profile is
roadmap, not a claim.
