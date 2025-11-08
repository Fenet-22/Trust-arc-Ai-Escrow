// Import required dependencies
import axios from "axios"; // HTTP client for making API requests
import dotenv from "dotenv"; // Loads environment variables from .env file

// Configure environment variables
dotenv.config();

// Circle API configuration
const CIRCLE_API = "https://api.circle.com/v1"; // Base URL for Circle API
const API_KEY = process.env.CIRCLE_API_KEY; // API key from environment variables

/**
 * Creates a new wallet using the Circle API
 * @returns {Promise<Object>} Promise that resolves to the wallet creation response data
 * @throws {Error} If the API request fails
 */
export async function createWallet() {
  // Make POST request to create a new wallet
  const res = await axios.post(
    `${CIRCLE_API}/wallets`, // Endpoint for wallet creation
    {}, // Empty request body (uses default parameters)
    {
      headers: { 
        Authorization: `Bearer ${API_KEY}` // Add API key to authorization header
      }
    }
  );
  return res.data; // Return the response data containing wallet information
}

/**
 * Transfers USDC from source wallet to destination wallet
 * @param {string} amount - The amount of USDC to transfer
 * @param {string} destinationWalletId - The ID of the destination wallet
 * @returns {Promise<Object>} Promise that resolves to the transfer response data
 * @throws {Error} If the API request fails
 */
export async function transferUSDC(amount, destinationWalletId) {
  // Make POST request to initiate USDC transfer
  const res = await axios.post(
    `${CIRCLE_API}/transfers`, // Endpoint for transfers
    {
      // Source wallet configuration
      source: { 
        type: "wallet", 
        id: process.env.SOURCE_WALLET_ID // Source wallet ID from environment variables
      },
      // Destination wallet configuration
      destination: { 
        type: "wallet", 
        id: destinationWalletId // Destination wallet ID passed as parameter
      },
      // Transfer amount configuration
      amount: { 
        amount, // Amount to transfer (passed as parameter)
        currency: "USD" // Currency (USDC is represented as USD in Circle API)
      },
      // Unique key to prevent duplicate transfers
      idempotencyKey: crypto.randomUUID() // Generate unique ID for idempotency
    }, 
    {
      headers: { 
        Authorization: `Bearer ${API_KEY}` // Add API key to authorization header
      }
    }
  );
  return res.data; // Return the response data containing transfer information
}