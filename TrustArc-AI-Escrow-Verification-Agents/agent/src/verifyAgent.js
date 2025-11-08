// agent/src/verifyagent.js
// AI Agent for automated task verification and escrow fund release
// This module handles AI-based proof verification and blockchain interactions

// Import required dependencies
import { ethers } from "ethers"; // Ethereum library for blockchain interactions
import dotenv from "dotenv"; // Environment variable management
import path from "path"; // Path utilities for file operations
import { fileURLToPath } from "url"; // URL utilities for ES modules

// ES module compatibility setup - convert import.meta.url to __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from the root .env file (two levels up from current directory)
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

// Environment configuration constants
const ARC_RPC_URL = process.env.ARC_TESTNET_RPC_URL; // RPC endpoint for Arc blockchain
const PRIVATE_KEY = process.env.PRIVATE_KEY; // Private key for blockchain transactions
const ESCROW_CONTRACT_ADDRESS = process.env.ESCROW_CONTRACT_ADDRESS; // Deployed escrow contract address

/**
 * Escrow Contract ABI (Application Binary Interface)
 * Defines the contract functions we can call
 * Minimal ABI for gas efficiency - only includes functions we actually use
 */
const ESCROW_ABI = [
  "function releaseFunds(bytes32 id)", // Release payment to freelancer
  "function refund(bytes32 id)", // Refund payment to client
  "function getEscrow(bytes32 id) view returns (tuple(address client, address freelancer, uint256 amount, bool released, bool refunded))" // View escrow details
];

// Security warning for missing private key
if (!PRIVATE_KEY) {
  console.warn("WARNING: PRIVATE_KEY not found in environment. You must add it to .env");
}

/**
 * Mock AI Verification Function
 * Simulates AI analysis of work proof - replace with actual AI service integration
 * @param {string} proofUrl - URL or identifier for the work proof (image, document, etc.)
 * @returns {Promise<boolean>} - True if verification passes, false if it fails
 */
export async function runAiVerification(proofUrl) {
  console.log(`[AI Agent] Analyzing proof at: ${proofUrl}`);
  
  // Simple mock verification logic - replace with real AI API call later
  // Current implementation: fails only if URL contains "fail" (for testing)
  if (proofUrl && proofUrl.toLowerCase().includes("fail")) return false;
  
  // Simulate AI processing time (1 second delay)
  await new Promise((resolve) => setTimeout(resolve, 1000));
  
  return true; // Default to verification success
}

/**
 * Main Task Verification Function
 * Orchestrates the entire verification and fund release process
 * @param {string} txnId - Unique transaction/escrow identifier
 * @param {string} proofUrl - URL or identifier for the work proof
 * @returns {Promise<Object>} - Result object with status and message
 */
export async function verifyTask(txnId, proofUrl) {
  try {
    console.log(`[TXN ${txnId}] Starting verification process...`);
    
    // Step 1: AI Verification - Analyze the work proof
    const verificationPassed = await runAiVerification(proofUrl);
    if (!verificationPassed) {
      console.log(`[TXN ${txnId}] AI verification failed for proof: ${proofUrl}`);
      return { 
        status: "REJECTED", 
        message: "AI verification failed." 
      };
    }
    console.log(`[TXN ${txnId}] AI verification passed`);

    // Step 2: Environment Validation - Check required configuration
    if (!PRIVATE_KEY) {
      throw new Error("PRIVATE_KEY is missing in the .env file.");
    }
    if (!ESCROW_CONTRACT_ADDRESS) {
      throw new Error("ESCROW_CONTRACT_ADDRESS is missing in the .env file.");
    }

    // Step 3: Blockchain Setup - Connect to network and prepare contract
    const provider = new ethers.JsonRpcProvider(ARC_RPC_URL);
    
    // Ensure private key has 0x prefix for ethers.js compatibility
    const formattedPrivateKey = PRIVATE_KEY.startsWith("0x") ? PRIVATE_KEY : `0x${PRIVATE_KEY}`;
    const signer = new ethers.Wallet(formattedPrivateKey, provider);
    const escrow = new ethers.Contract(ESCROW_CONTRACT_ADDRESS, ESCROW_ABI, signer);

    // Step 4: On-chain Execution - Release funds to freelancer
    console.log(`[TXN ${txnId}] Calling releaseFunds with agent: ${await signer.getAddress()}`);
    
    // Convert string ID to bytes32 for blockchain (using ethers.id for keccak256 hash)
    const bytes32Id = ethers.id(txnId);
    const tx = await escrow.releaseFunds(bytes32Id);
    
    console.log(`[TXN ${txnId}] Transaction submitted - hash: ${tx.hash}`);
    
    // Step 5: Transaction Confirmation - Wait for blockchain confirmation
    await tx.wait();
    console.log(`[TXN ${txnId}] Funds released on-chain successfully`);
    
    // Step 6: Return Success Result
    return { 
      status: "VERIFIED", 
      message: `Funds released. Transaction: ${tx.hash}` 
    };

  } catch (error) {
    // Comprehensive error handling for different failure scenarios
    console.error("CRITICAL ERROR during verifyTask:", error);
    
    // Determine error type and provide appropriate response
    let errorMessage = `Blockchain error: ${error.message}`;
    
    // Common error scenarios with specific messaging
    if (error.message.includes("insufficient funds")) {
      errorMessage = "Agent wallet has insufficient funds for gas fees";
    } else if (error.message.includes("revert")) {
      errorMessage = "Contract reverted transaction - check escrow state";
    } else if (error.message.includes("network")) {
      errorMessage = "Network connection error - check RPC URL";
    }
    
    return { 
      status: "ERROR", 
      message: errorMessage 
    };
  }
}

// Additional utility functions that could be added:

/**
 * Example: Refund function for failed verifications (commented out)
 * 
 * export async function refundTask(txnId, reason) {
 *   try {
 *     const provider = new ethers.JsonRpcProvider(ARC_RPC_URL);
 *     const signer = new ethers.Wallet(PRIVATE_KEY, provider);
 *     const escrow = new ethers.Contract(ESCROW_CONTRACT_ADDRESS, ESCROW_ABI, signer);
 * 
 *     console.log(`[TXN ${txnId}] Processing refund: ${reason}`);
 *     const tx = await escrow.refund(ethers.id(txnId));
 *     await tx.wait();
 *     
 *     return { status: "REFUNDED", message: `Refund completed. Tx: ${tx.hash}` };
 *   } catch (error) {
 *     console.error("Refund failed:", error);
 *     return { status: "ERROR", message: `Refund failed: ${error.message}` };
 *   }
 * }
 */

/**
 * Example: Escrow status check function (commented out)
 * 
 * export async function getEscrowStatus(txnId) {
 *   const provider = new ethers.JsonRpcProvider(ARC_RPC_URL);
 *   const escrow = new ethers.Contract(ESCROW_CONTRACT_ADDRESS, ESCROW_ABI, provider);
 *   
 *   const escrowData = await escrow.getEscrow(ethers.id(txnId));
 *   return escrowData;
 * }
 */

/**
 * Usage Example:
 * 
 * import { verifyTask } from './verifyagent.js';
 * 
 * const result = await verifyTask("job-123", "https://proof-storage.com/proof123.jpg");
 * console.log(result);
 * // Output: { status: "VERIFIED", message: "Funds released. Tx: 0x..." }
 */