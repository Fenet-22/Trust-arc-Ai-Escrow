// Hardhat configuration file
// This file configures Hardhat development environment for smart contract development

// Import required dependencies
import { config as dotenvConfig } from "dotenv"; // Load environment variables from .env file
import "@nomicfoundation/hardhat-toolbox"; // Import Hardhat toolbox plugins for testing, verification, etc.

// Load environment variables from .env file into process.env
dotenvConfig();

// Environment Configuration Instructions:
// Make sure your .env file has the following lines:
// PRIVATE_KEY=your_private_key_here_without_0x_prefix
// ARC_TESTNET_RPC_URL=https://rpc.testnet.arc.network
// ARC_CHAIN_ID=5042002

/**
 * Load and validate the private key from environment variables
 * Handles both formats: with and without 0x prefix
 * If PRIVATE_KEY starts with 0x, use as-is
 * If PRIVATE_KEY doesn't start with 0x, add the prefix
 * If PRIVATE_KEY is not defined, set to undefined
 */
const PRIVATE_KEY = process.env.PRIVATE_KEY?.startsWith("0x")
  ? process.env.PRIVATE_KEY // Use as-is if already has 0x prefix
  : process.env.PRIVATE_KEY
  ? `0x${process.env.PRIVATE_KEY}` // Add 0x prefix if missing
  : undefined; // Set to undefined if no private key provided

/**
 * Hardhat configuration object
 * Defines compiler settings, networks, and other Hardhat options
 */
export default {
  // Solidity compiler configuration
  solidity: {
    // Use Solidity version 0.8.20 (specific version for compatibility)
    version: "0.8.20",
    // Compiler settings for optimization
    settings: {
      optimizer: { 
        enabled: true, // Enable optimizer to reduce gas costs
        runs: 200, // Optimize for 200 runs (balances between deployment and execution gas)
      },
    },
  },
  
  // Network configurations for deployment and testing
  networks: {
    /**
     * Arc Testnet configuration
     * Used for deploying to Arc Network's testnet
     */
    arc: {
      // RPC URL for Arc Testnet - loaded from environment or use default
      url: process.env.ARC_TESTNET_RPC_URL || "https://rpc.testnet.arc.network",
      // Chain ID for Arc Testnet - parsed from environment or use default
      chainId: Number(process.env.ARC_CHAIN_ID) || 5042002,
      // Account configuration - use private key if provided
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [], // must be exactly 32 bytes (64 hex chars)
    },
    
    /**
     * Local development network configuration
     * Used for testing contracts on a local Hardhat network
     */
    localhost: {
      url: "http://127.0.0.1:8545", // Local Hardhat node RPC endpoint
      chainId: 31337, // Default chain ID for Hardhat local network
      // Note: No accounts specified - Hardhat provides default accounts for local development
    },
    
    // Additional networks can be added here following the same pattern:
    // mainnet: { ... },
    // sepolia: { ... },
    // etc.
  },
  
  // Additional Hardhat configuration options can be added below:
  // paths: { ... } - Custom file paths
  // etherscan: { ... } - For contract verification
  // gasReporter: { ... } - For gas usage analysis
};