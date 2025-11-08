// frontend/src/utils/ethers.js
// Ethers.js utilities for blockchain interactions
import { ethers } from "ethers";
import escrowAbi from "../../../artifacts/contracts/TrustArcEscrow.sol/TrustArcEscrow.json";

// Contract address from environment variables
const CONTRACT_ADDRESS = import.meta.env.VITE_ESCROW_CONTRACT_ADDRESS;

/**
 * Get Ethereum provider and signer from MetaMask
 * @returns {Promise<Object>} Provider and signer objects
 */
export async function getProvider() {
  if (!window.ethereum) throw new Error("MetaMask not detected");
  const provider = new ethers.BrowserProvider(window.ethereum);
  await provider.send("eth_requestAccounts", []); // Request account access
  const signer = await provider.getSigner();
  return { provider, signer };
}

/**
 * Create a new escrow agreement
 * @param {string} client - Client address
 * @param {string} description - Task description
 * @param {string} amount - Amount in ETH/USDC
 * @returns {Promise<string>} Escrow ID from transaction logs
 */
export async function createEscrow(client, description, amount) {
  const { signer } = await getProvider();
  const contract = new ethers.Contract(CONTRACT_ADDRESS, escrowAbi.abi, signer);
  const tx = await contract.createEscrow(description, ethers.parseUnits(amount, 18));
  const receipt = await tx.wait();
  // Extract escrow ID from transaction event logs
  const escrowId = receipt.logs[0]?.args?.escrowId?.toString() ?? "N/A";
  return escrowId;
}

/**
 * Deposit funds into existing escrow
 * @param {string} escrowId - Escrow identifier
 * @param {string} amount - Amount to deposit
 */
export async function depositFunds(escrowId, amount) {
  const { signer } = await getProvider();
  const contract = new ethers.Contract(CONTRACT_ADDRESS, escrowAbi.abi, signer);
  const tx = await contract.deposit(escrowId, ethers.parseUnits(amount, 18));
  await tx.wait();
}

/**
 * Release funds from escrow to freelancer
 * @param {string} escrowId - Escrow identifier
 */
export async function releaseFunds(escrowId) {
  const { signer } = await getProvider();
  const contract = new ethers.Contract(CONTRACT_ADDRESS, escrowAbi.abi, signer);
  const tx = await contract.releaseFunds(escrowId);
  await tx.wait();
}