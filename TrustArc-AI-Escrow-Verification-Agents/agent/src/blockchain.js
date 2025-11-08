// agent/src/blockchain.js
// Blockchain interaction module for escrow contract operations
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";
import { ethers } from "ethers";
import dotenv from "dotenv";

// ES modules compatibility setup
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from project root
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

// Load contract ABI from Hardhat compilation artifacts
const escrowArtifactPath = path.resolve(__dirname, "../../artifacts/contracts/TrustArcEscrow.sol/TrustArcEscrow.json");
let escrowAbi;
try {
  const json = JSON.parse(readFileSync(escrowArtifactPath, "utf8"));
  escrowAbi = json.abi;
} catch (err) {
  throw new Error(`Cannot load escrow ABI from ${escrowArtifactPath}: ${err.message}`);
}

// Environment configuration
const RPC = process.env.ARC_TESTNET_RPC_URL;
const PK = process.env.PRIVATE_KEY;
const ESCROW_ADDRESS = process.env.ESCROW_CONTRACT_ADDRESS;

// Validate required environment variables
if (!RPC) throw new Error("❌ Missing ARC_TESTNET_RPC_URL in .env");
if (!PK) throw new Error("❌ Missing PRIVATE_KEY in .env");
if (!ESCROW_ADDRESS) throw new Error("❌ Missing ESCROW_CONTRACT_ADDRESS in .env");

// Initialize blockchain connection and contract instance
const provider = new ethers.JsonRpcProvider(RPC);
const signer = new ethers.Wallet(PK.startsWith("0x") ? PK : `0x${PK}`, provider);
const escrowContract = new ethers.Contract(ESCROW_ADDRESS, escrowAbi, signer);

/**
 * Release funds from escrow to freelancer
 * @param {string|number} escrowIdOrTxnId - Escrow ID or transaction identifier
 * @returns {Promise<string>} Transaction hash
 */
export async function releaseFunds(escrowIdOrTxnId) {
  try {
    console.log(`🔗 Sending release call for id=${escrowIdOrTxnId} from ${signer.address}`);
    
    // Convert ID to appropriate format (bytes32 for hashed IDs, number for numeric IDs)
    const param = isNaN(Number(escrowIdOrTxnId)) ? ethers.id(String(escrowIdOrTxnId)) : Number(escrowIdOrTxnId);
    
    const tx = await escrowContract.releaseFunds(param);
    console.log("Tx sent:", tx.hash);
    await tx.wait(); // Wait for transaction confirmation
    console.log("Tx confirmed:", tx.hash);
    return tx.hash;
  } catch (err) {
    console.error("❌ releaseFunds error:", err);
    throw err;
  }
}

/**
 * Get escrow details from blockchain
 * @param {string|number} escrowId - Escrow identifier
 * @returns {Promise<Object>} Escrow details
 */
export async function getEscrowDetails(escrowId) {
  try {
    console.log("📋 Fetching escrow details for ID:", escrowId);
    const param = isNaN(Number(escrowId)) ? ethers.id(String(escrowId)) : Number(escrowId);
    const details = await escrowContract.getEscrow(param);
    return details;
  } catch (err) {
    console.error("❌ getEscrowDetails error:", err);
    throw err;
  }
}