// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Gate
/// @notice Smallest contract that still exercises the full lifecycle Portaldot needs:
///         a state-changing call, an event, and readable state. Kept tiny on purpose:
///         Portaldot charges ~0.078 tPOT of storage deposit per byte of contract code.
contract Gate {
    uint256 internal counter;
    event Bumped(uint256 counter);
    function bump(uint256 by) external { counter += by; emit Bumped(counter); }
}
