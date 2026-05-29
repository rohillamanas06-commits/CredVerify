// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IssuerRegistry
 * @notice Maintains a whitelist of institutions allowed to issue credentials.
 *         Only the contract owner (you) can add/remove issuers.
 */
contract IssuerRegistry {

    address public owner;

    mapping(address => bool) private registeredIssuers;
    mapping(address => string) public issuerNames;

    event IssuerRegistered(address indexed issuer, string name);
    event IssuerRevoked(address indexed issuer);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /// @notice Register a new institution wallet as a trusted issuer
    function registerIssuer(address issuer, string calldata name) external onlyOwner {
        require(issuer != address(0), "Invalid address");
        require(!registeredIssuers[issuer], "Already registered");
        registeredIssuers[issuer] = true;
        issuerNames[issuer] = name;
        emit IssuerRegistered(issuer, name);
    }

    /// @notice Remove an institution from the whitelist
    function revokeIssuer(address issuer) external onlyOwner {
        require(registeredIssuers[issuer], "Not registered");
        registeredIssuers[issuer] = false;
        emit IssuerRevoked(issuer);
    }

    /// @notice Check if a wallet is a registered issuer
    function isRegisteredIssuer(address issuer) external view returns (bool) {
        return registeredIssuers[issuer];
    }

    /// @notice Transfer contract ownership
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        owner = newOwner;
    }
}
