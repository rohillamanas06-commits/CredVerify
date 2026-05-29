require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

module.exports = {
  solidity: "0.8.20",
  networks: {
    amoy: {
      url: "https://rpc-amoy.polygon.technology",
      accounts: [process.env.BACKEND_WALLET_PRIVATE_KEY],
      chainId: 80002,
    },
    polygon: {
      url: "https://polygon-rpc.com",
      accounts: [process.env.BACKEND_WALLET_PRIVATE_KEY],
      chainId: 137,
    },
  },
};