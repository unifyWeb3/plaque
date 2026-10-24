// The two V3 testnet constraints that shaped the deployed contract (VERIFIED 2026-10-21 → 2026-10-24)
//
// ---------------------------------------------------------------------------------------------
// 1. pallet-revive reverts on the BLOCK-family opcodes
// ---------------------------------------------------------------------------------------------
// Evidence:
//  * contracts/Probe.sol  (81 bytes) stores block.chainid   -> deployment REVERTED
//    tx 0x99e40a1842e242d63c68417b2a731af68efe65f4eac9630e2dc7c8c899759e0c, block 133190
//  * contracts/Probe2.sol (121 bytes) stores block.timestamp and block.number
//    -> deployment REVERTED
//    tx 0xba2610496c3f9046aa29f9a1a4f42b9b0c3ca1af72fe5b741293951d3518fcff, block 133151
//  * contracts/Gate.sol  (214 bytes) uses no block.* opcode -> deployment SUCCEEDED
//  * contracts/Plaque.sol (786 bytes): its **constructor** uses no block.* opcode -> deployment SUCCEEDED;
//    its **claim** path reads block.chainid and block.timestamp, so claims revert
//    tx 0x7857ccc37707d6303f97b6001828b33177e6bd546d16bb00e3597a3ca663f14d, block 132033
//
// Both failing probes were given a gas limit above the affordable ceiling (1.15e15 gas), so the
// failure is not a gas/fee problem, and both failed after ~5.9e11 gas, i.e. inside the constructor.
//
// => CHAINID / TIMESTAMP / NUMBER revert on this runtime.
//
// The first Plaque build put block.chainid in the claim digest, so every claim reverted while the
// identical contract and client code passed all unit tests on ganache (12+ sponsored attempts, all
// status 0x0).
//
// RESOLVED: no build that is meant to claim on this chain reads any block value. The chain id is a
// compile-time constant (420420777) and the digest binds handle + claimant + chain id + contract.
//
// ---------------------------------------------------------------------------------------------
// 2. The runtime charges deposits for code and storage, and derives the allowance from the gas limit
// ---------------------------------------------------------------------------------------------
// Evidence:
//  * 786 bytes of code cost 74.51 tPOT to deploy; 302 bytes cost 36.71 tPOT
//    (tx 0xcee4d1db6c86250faa16bd67419168c7628c8a88533bf3d84316ccfd0c3bb63a, block 167044).
//  * One new mapping entry costs ≈3.84 tPOT of storage deposit: the live claim used
//    117,560,751,145,021 gas × 32,915 wei = 3.8695 tPOT, of which ≈0.028 tPOT was computation
//    (measured by the same call aborting at the write on a small gas limit: 850,785,408,901 gas).
//  * A transaction whose storage-deposit allowance is too small traps at the write
//    ("ContractTrapped"), even though the same call succeeds under eth_call (which pays no deposit).
//  * The pool also requires balance >= gasLimit × maxFeePerGas, so the gas limit cannot simply be
//    raised without funds.
//
// CONSEQUENCE: the readable chain-compatible build (contracts/PlaqueV2.sol, 741 bytes, ~74.5 tPOT to
// deploy) could not be deployed on the available budget. The deployed build is
// contracts/PlaqueLite.sol: 302 bytes, the same digest and storage slot, the three-address Claimed event, and
// no block.* dependency. It deliberately has no release and no validity window. It claimed live on 2026-10-24 (tx
// 0xa654bd9ce55b389c072b00d0c4af55ab067d76acc422d5636b0c62863786edf2, block 167209) and
// `npm run verify:live` re-checks the whole path read-only.
