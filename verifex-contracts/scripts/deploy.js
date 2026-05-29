// scripts/deploy.js
// Run: npx hardhat run scripts/deploy.js --network mumbai

const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with wallet:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Wallet balance:", ethers.formatEther(balance), "MATIC");

  if (balance === 0n) {
    throw new Error("Wallet has no MATIC. Get testnet MATIC from https://faucet.polygon.technology");
  }

  // 1. Deploy IssuerRegistry first
  console.log("\nDeploying IssuerRegistry...");
  const IssuerRegistry = await ethers.getContractFactory("IssuerRegistry");
  const issuerRegistry = await IssuerRegistry.deploy();
  await issuerRegistry.waitForDeployment();
  const issuerRegistryAddress = await issuerRegistry.getAddress();
  console.log("IssuerRegistry deployed at:", issuerRegistryAddress);

  // 2. Deploy CredentialRegistry, passing IssuerRegistry address
  console.log("\nDeploying CredentialRegistry...");
  const CredentialRegistry = await ethers.getContractFactory("CredentialRegistry");
  const credentialRegistry = await CredentialRegistry.deploy(issuerRegistryAddress);
  await credentialRegistry.waitForDeployment();
  const credentialRegistryAddress = await credentialRegistry.getAddress();
  console.log("CredentialRegistry deployed at:", credentialRegistryAddress);

  // 3. Register the deployer wallet as the first issuer (your backend wallet)
  console.log("\nRegistering deployer as first issuer...");
  const tx = await issuerRegistry.registerIssuer(deployer.address, "Verifex Admin");
  await tx.wait();
  console.log("Deployer registered as issuer.");

  // 4. Print .env values to copy
  console.log("\n─────────────────────────────────────────────");
  console.log("PASTE THESE INTO YOUR .env FILE:");
  console.log("─────────────────────────────────────────────");
  console.log(`CONTRACT_ADDRESS=${credentialRegistryAddress}`);
  console.log(`ISSUER_REGISTRY_ADDRESS=${issuerRegistryAddress}`);
  console.log("─────────────────────────────────────────────");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
