// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./IssuerRegistry.sol";

/**
 * @title CredentialRegistry
 * @notice Stores SHA-256 hashes of credentials on-chain.
 *         Only wallets registered in IssuerRegistry can issue credentials.
 *         Anyone can verify. Only the issuer or owner can revoke.
 */
contract CredentialRegistry {

    address public owner;
    IssuerRegistry public issuerRegistry;

    struct Credential {
        bool exists;
        bool isRevoked;
        address issuer;
        uint256 timestamp;
        string credentialId;   // UUID from your backend DB
        string revocationReason;
    }

    // document SHA-256 hash (bytes32) => Credential
    mapping(bytes32 => Credential) private credentials;

    event CredentialIssued(
        bytes32 indexed credentialHash,
        address indexed issuer,
        string credentialId,
        uint256 timestamp
    );

    event CredentialRevoked(
        bytes32 indexed credentialHash,
        address indexed revokedBy,
        string reason,
        uint256 timestamp
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier onlyRegisteredIssuer() {
        require(
            issuerRegistry.isRegisteredIssuer(msg.sender) || msg.sender == owner,
            "Not a registered issuer"
        );
        _;
    }

    constructor(address _issuerRegistry) {
        owner = msg.sender;
        issuerRegistry = IssuerRegistry(_issuerRegistry);
    }

    /**
     * @notice Issue a credential by storing its hash on-chain.
     * @param credentialHash SHA-256 hash of the document as bytes32
     * @param issuer         Wallet address of the issuing institution
     * @param credentialId   UUID string from your backend (for cross-reference)
     */
    function issueCredential(
        bytes32 credentialHash,
        address issuer,
        string calldata credentialId
    ) external onlyRegisteredIssuer {
        require(!credentials[credentialHash].exists, "Credential already exists");
        require(issuer != address(0), "Invalid issuer address");

        credentials[credentialHash] = Credential({
            exists: true,
            isRevoked: false,
            issuer: issuer,
            timestamp: block.timestamp,
            credentialId: credentialId,
            revocationReason: ""
        });

        emit CredentialIssued(credentialHash, issuer, credentialId, block.timestamp);
    }

    /**
     * @notice Revoke a credential. Only original issuer or contract owner can revoke.
     * @param credentialHash SHA-256 hash of the document
     * @param reason         Human-readable reason for revocation
     */
    function revokeCredential(
        bytes32 credentialHash,
        string calldata reason
    ) external {
        Credential storage cred = credentials[credentialHash];
        require(cred.exists, "Credential does not exist");
        require(!cred.isRevoked, "Already revoked");
        require(
            msg.sender == cred.issuer || msg.sender == owner,
            "Not authorized to revoke"
        );

        cred.isRevoked = true;
        cred.revocationReason = reason;

        emit CredentialRevoked(credentialHash, msg.sender, reason, block.timestamp);
    }

    /**
     * @notice Verify a credential by its document hash.
     * @param credentialHash SHA-256 hash of the document
     * @return exists            Whether this hash is recorded on-chain
     * @return isRevoked         Whether it has been revoked
     * @return issuer            Wallet of the issuing institution
     * @return timestamp         Unix timestamp of issuance
     * @return credentialId      Backend UUID for cross-reference
     * @return revocationReason  Reason if revoked, empty string otherwise
     */
    function verifyCredential(bytes32 credentialHash)
        external
        view
        returns (
            bool exists,
            bool isRevoked,
            address issuer,
            uint256 timestamp,
            string memory credentialId,
            string memory revocationReason
        )
    {
        Credential storage cred = credentials[credentialHash];
        return (
            cred.exists,
            cred.isRevoked,
            cred.issuer,
            cred.timestamp,
            cred.credentialId,
            cred.revocationReason
        );
    }

    /// @notice Transfer contract ownership
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        owner = newOwner;
    }

    /// @notice Update the IssuerRegistry address if needed
    function updateIssuerRegistry(address _issuerRegistry) external onlyOwner {
        issuerRegistry = IssuerRegistry(_issuerRegistry);
    }
}
