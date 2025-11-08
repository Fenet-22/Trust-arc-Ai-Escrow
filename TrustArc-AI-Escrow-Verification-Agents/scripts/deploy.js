// scripts/deployMockUSDC.js
// Deployment script for MockUSDC token contract on Arc Testnet
// This script handles the compilation and deployment of a mock USDC token for testing

// Import Hardhat Runtime Environment (hre) - provides access to ethers, network, etc.
import hre from "hardhat";

/**
 * Main deployment function
 * Handles the entire deployment process from compilation to verification
 */
async function main() {
  // Deployment initiation message
  console.log("🚀 Deploying MockUSDC to Arc Testnet...");

  // Step 1: Compile and get the contract factory
  // The contract factory is used to create instances of the MockUSDC contract
  // This automatically compiles the contract if not already compiled
  const MockUSDC = await hre.ethers.getContractFactory("MockUSDC");

  // Step 2: Deploy the contract
  // This sends the deployment transaction to the network
  // The deployer account is automatically selected from Hardhat configuration
  const mockUSDC = await MockUSDC.deploy();

  // Step 3: Wait for deployment to be confirmed on blockchain
  // This waits for the transaction to be mined and contract creation confirmed
  // waitForDeployment() replaces deployed() in newer ethers versions
  await mockUSDC.waitForDeployment();

  // Step 4: Get the deployed contract address
  // This retrieves the actual address where the contract was deployed
  const address = await mockUSDC.getAddress();
  
  // Step 5: Display deployment success information
  console.log(`✅ MockUSDC deployed successfully!`);
  console.log(`📜 Contract address: ${address}`);
  console.log(`💰 You now have 1,000,000 mUSDC in your deployer wallet!`);
  
  // Additional information that could be useful:
  // console.log(`🔗 Explorer URL: [Add blockchain explorer URL here]`);
  // console.log(`📄 Transaction hash: ${mockUSDC.deploymentTransaction().hash}`);
}

/**
 * Error handling wrapper for the main function
 * Ensures proper process exit codes and error reporting
 */
main().catch((error) => {
  // Log detailed error information for debugging
  console.error("❌ Deployment failed:", error);
  
  // Set process exit code to 1 (failure)
  // This is important for CI/CD pipelines to detect deployment failures
  process.exitCode = 1;
});

// Additional deployment script features that could be added:

/**
 * Example: Contract verification function (commented out)
 * 
 * async function verifyContract(address, constructorArguments) {
 *   console.log("🔍 Verifying contract on block explorer...");
 *   try {
 *     await hre.run("verify:verify", {
 *       address: address,
 *       constructorArguments: constructorArguments,
 *     });
 *     console.log("✅ Contract verified successfully!");
 *   } catch (error) {
 *     console.log("⚠️ Contract verification failed:", error.message);
 *   }
 * }
 */

/**
 * Example: Post-deployment setup (commented out)
 * 
 * async function setupContract(mockUSDC) {
 *   // Perform any post-deployment setup here, such as:
 *   // - Transfer tokens to specific addresses
 *   // - Set up roles and permissions
 *   // - Initialize contract state
 *   console.log("⚙️ Performing post-deployment setup...");
 *   
 *   // Example: Transfer tokens to team wallets
 *   // const teamWallet = "0x...";
 *   // await mockUSDC.transfer(teamWallet, ethers.parseUnits("100000", 6));
 *   // console.log("✅ Tokens transferred to team wallet");
 * }
 */

/**
 * Usage instructions:
 * 1. Make sure your Hardhat config is set up with the correct network
 * 2. Run with: npx hardhat run scripts/deployMockUSDC.js --network arc
 * 3. For local testing: npx hardhat run scripts/deployMockUSDC.js --network localhost
 */