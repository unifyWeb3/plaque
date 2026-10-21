// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title PlaqueV2
/// @notice Chain-compatible build of the Plaque handle registry for the Portaldot V3 testnet.
///
/// The V3 runtime runs pallet-revive, and its BLOCK-family opcodes (CHAINID / TIMESTAMP /
/// NUMBER) revert: a probe that stores `block.chainid` cannot even be deployed
/// (see state/CHAIN-LIMITATION.md for the transactions). The first Plaque build used
/// `block.chainid` inside the claim digest, so every claim reverted.
///
/// This build removes every `block.*` dependency:
///   * the chain id is a compile-time constant in the digest,
///   * the signature window is enforced by the sponsor, because the contract cannot read a
///     clock on this runtime,
///   * the digest still binds the handle, the claimant, the chain id and this contract, so a
///     claim cannot be moved to another name, another address, another chain or another
///     contract.
///
/// Storage layout, event shape and the refusal set are identical to Plaque.sol, so the SDK,
/// the dashboard and the relayer work against either build.
contract PlaqueV2 {
    /// @dev The chain id of the Portaldot V3 testnet, as a constant: `block.chainid` is not
    ///      usable on this runtime.
    uint256 private constant CHAIN_ID = 420420777;

    /// @notice The address that currently owns a handle.
    mapping(bytes32 => address) public ownerOf;

    /// @notice Emitted when a handle is claimed.
    /// @param handle   the 32-byte handle key.
    /// @param who      the address that signed for the handle (the owner).
    /// @param sponsor  the address that submitted the claim and paid the gas.
    /// @param gasPrice the price per gas the sponsor paid.
    event Claimed(bytes32 indexed handle, address indexed who, address indexed sponsor, uint256 gasPrice);

    /// @notice Emitted when the owner releases a handle so it can be claimed again.
    event Released(bytes32 indexed handle, address indexed who);

    /// @notice The handle key is empty, or it already has an owner.
    error Unavailable();
    /// @notice The signature does not recover to the claimed address.
    error BadSignature();
    /// @notice The caller does not own the handle.
    error NotOwner();

    /// @notice Claim a handle for the address that signed the claim.
    /// @param handle 32-byte key: the UTF-8 handle, zero-padded.
    /// @param who    the address that is claiming the handle; it must be the address that signed.
    /// @param v       EIP-191 signature component.
    /// @param r       EIP-191 signature component.
    /// @param s       EIP-191 signature component.
    function claim(bytes32 handle, address who, uint8 v, bytes32 r, bytes32 s) external {
        if (handle == bytes32(0) || ownerOf[handle] != address(0)) revert Unavailable();
        if (who == address(0)) revert BadSignature();

        // Digest = keccak256(abi.encode(
        //     bytes32(1)                       // version
        //     handle                           // the handle being claimed
        //     bytes32(uint160(who))            // the address the claim is for
        //     bytes32(CHAIN_ID)                // chain binding
        //     bytes32(uint160(address(this)))   // contract binding
        // ))
        bytes32 digest = keccak256(
            abi.encode(
                bytes32(uint256(1)),
                handle,
                bytes32(uint256(uint160(who))),
                bytes32(CHAIN_ID),
                bytes32(uint256(uint160(address(this))))
            )
        );

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
    function release(bytes32 handle) external {
        if (ownerOf[handle] != msg.sender) revert NotOwner();
        ownerOf[handle] = address(0);
        emit Released(handle, msg.sender);
    }
}
