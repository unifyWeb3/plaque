// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Plaque
/// @notice The Plaque handle registry for the Portaldot V3 testnet.
///
/// A *handle* is a 32-byte key (the UTF-8 name, zero-padded) bound to the address that signed
/// for it. The claimant never needs gas: a sponsor submits the signed claim and pays the gas.
/// The contract recovers the signature itself, so a sponsor can never bind a name to somebody
/// else's address, and a captured signature is useless after `validUntil`.
///
/// This contract holds no funds, mints nothing and has no upgrade path. The only state it keeps
/// is `ownerOf[handle]` and a claim counter.
///
/// Deposit note: Portaldot charges a storage deposit of roughly 0.138 tPOT per byte of contract
/// code, so this contract is deliberately kept small. The settings used for the deployment are
/// recorded in the repository README.
contract Plaque {
    /// @notice The address that currently owns a handle.
    mapping(bytes32 => address) public ownerOf;

    /// @notice Emitted when a handle is claimed.
    /// @param handle  the 32-byte handle key.
    /// @param who     the address that signed for the handle (the owner).
    /// @param sponsor the address that submitted the claim and paid the gas.
    /// @param gasPrice the price per gas the sponsor paid.
    event Claimed(bytes32 indexed handle, address indexed who, address indexed sponsor, uint256 gasPrice);

    /// @notice Emitted when the owner releases a handle so it can be claimed again.
    event Released(bytes32 indexed handle, address indexed who);

    /// @notice The handle key is empty, or it already has an owner.
    error Unavailable();
    /// @notice The signed claim is past its validity window.
    error ClaimExpired();
    /// @notice The signature does not recover to a usable address.
    error BadSignature();
    /// @notice The caller does not own the handle.
    error NotOwner();

    /// @notice Claim a handle for the address that signed the claim.
    /// @param handle      32-byte key: the UTF-8 handle, zero-padded.
    /// @param who         the address that is claiming the handle. It must be the address that
    ///                    signed the claim digest, and the digest binds it, so the claim cannot
    ///                    be moved to a different address.
    /// @param v           EIP-191 signature component.
    /// @param r           EIP-191 signature component.
    /// @param s           EIP-191 signature component.
    /// @param validUntil  unix timestamp after which this signature must no longer be accepted.
    function claim(
        bytes32 handle,
        address who,
        uint8 v,
        bytes32 r,
        bytes32 s,
        uint64 validUntil
    ) external {
        if (handle == bytes32(0) || ownerOf[handle] != address(0)) revert Unavailable();
        if (who == address(0)) revert BadSignature();
        if (block.timestamp > validUntil) revert ClaimExpired();

        // Digest = keccak256(abi.encode(
        //     bytes32(1)                       // version
        //     handle                           // the handle being claimed
        //     who                              // the address the claim is for
        //     bytes32(validUntil)              // expiry of the signature
        //     bytes32(block.chainid)           // chain binding
        //     bytes32(address(this))            // contract binding
        // ))
        bytes32 digest = keccak256(
            abi.encode(
                bytes32(uint256(1)),
                handle,
                bytes32(uint256(uint160(who))),
                bytes32(uint256(validUntil)),
                bytes32(uint256(block.chainid)),
                bytes32(uint256(uint160(address(this))))
            )
        );

        // EIP-191 personal_sign over the 32-byte digest. The recovered address must be exactly
        // `who`: a malformed signature recovers to some other (or zero) address and is refused.
        address signer = ecrecover(
            keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", digest)),
            v,
            r,
            s
        );
        if (signer != who) revert BadSignature();

        ownerOf[handle] = signer;
        emit Claimed(handle, signer, msg.sender, tx.gasprice);
    }

    /// @notice Release a handle so that it can be claimed again.
    /// @param handle the 32-byte handle key.
    function release(bytes32 handle) external {
        if (ownerOf[handle] != msg.sender) revert NotOwner();
        ownerOf[handle] = address(0);
        emit Released(handle, msg.sender);
    }
}
