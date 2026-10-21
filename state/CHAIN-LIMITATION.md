// Stage 0.6 — why the live claim reverts (VERIFIED 2026-10-21)
//
// Evidence:
//  * contracts/Probe.sol  (81 bytes) stores block.chainid   -> deployment REVERTED
//    tx 0x99e40a1842e242d63c68417b2a731af68efe65f4eac9630e2dc7c8c899759e0c, block 133190
//  * contracts/Probe2.sol (121 bytes) stores block.timestamp and block.number
//    -> deployment REVERTED
//    tx 0xba2610496c3f9046aa29f9a1a4f42b9b0c3ca1af72fe5b741293951d3518fcff, block 133151
//  * contracts/Gate.sol  (214 bytes) uses no block.* opcode -> deployment SUCCEEDED
//  * contracts/Plaque.sol (786 bytes) uses no block.* opcode -> deployment SUCCEEDED
//    tx 0x7857ccc37707d6303f97b6001828b33177e6bd546d16bb00e3597a3ca663f14d, block 132033
//
// Both failing probes were given a gas limit above the affordable ceiling
// (1.15e15 gas) so the failure is not a gas/fee problem, and both failed after
// ~5.9e11 gas, i.e. inside the constructor.
//
// => pallet-revive on the Portaldot V3 testnet does not implement the BLOCK-family
//    opcodes (CHAINID / TIMESTAMP / NUMBER): they revert.
//
// Plaque.sol puts block.chainid in the claim digest, so every claim reverts with
// BadSignature (the digest never matches). That is why all 12+ sponsored claim
// attempts reverted while the identical contract and identical client code pass
// all 16 unit tests on ganache.
//
// Fix: contracts/PlaqueV2.sol removes every block.* dependency:
//   * the chain id is a compile-time constant (420420777) in the digest,
//   * the signature window is enforced by the sponsor (the chain has no clock),
//   * the digest still binds handle + claimant + chain id + contract address.
// A redeploy needs ~71 tPOT, which the current testnet wallet (41.4 tPOT) does
// not have - see state/MEMORY.md for the funding request.
