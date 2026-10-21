// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Probe
/// @notice Diagnostic contract: stores the EVM's block.chainid in storage slot 0 so it can be
///         read with eth_getStorageAt (the public node's eth_call is currently unusable).
contract Probe {
    uint256 public chainId;

    constructor() {
        chainId = block.chainid;
    }
}
