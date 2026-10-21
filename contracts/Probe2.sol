// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Probe2
/// @notice Diagnostic contract: stores the EVM's block.timestamp (slot 0) and block.number
///         (slot 1). Deliberately avoids block.chainid: the first probe, which stored it,
///         reverted, which points at pallet-revive's CHAINID opcode on this runtime.
contract Probe2 {
    uint256 public timestamp;
    uint256 public number;

    constructor() {
        timestamp = block.timestamp;
        number = block.number;
    }
}
