// scripts/mint.js
import hre from "hardhat";

async function main() {
  // 🪙 Your deployed MockUSDC contract address
  const usdcAddress = "0x2bdCC0de6bE1f7D2ee689a0342D76F52E8EFABa3";

  // 💼 Your MetaMask wallet address (Arc Testnet account)
  const walletAddress = "0xa53cfa37436e8dfe5bfbe77389f15f496a105c73";

  // ✅ Get ethers.js contract instance from Hardhat
  const usdc = await hre.ethers.getContractAt("MockUSDC", usdcAddress);

  // Detect decimals dynamically
  const decimals = await usdc.decimals();

  console.log(`🚰 Minting 1,000,000 mUSDC to ${walletAddress}...`);

  // 🧾 Mint 1,000,000 tokens using the correct decimals
  const amount = hre.ethers.parseUnits("1000000", decimals);
  const tx = await usdc.faucet(walletAddress, amount);
  await tx.wait();

  console.log("✅ Faucet transaction confirmed!");

  // Show updated balance
  const balance = await usdc.balanceOf(walletAddress);
  console.log(`💰 Your mUSDC balance is now: ${hre.ethers.formatUnits(balance, decimals)} mUSDC`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
