// scripts/demoFlow.js
const hre = require("hardhat");
const ethers = hre.ethers;
require("dotenv").config();
const fetch = require("node-fetch");

async function main() {
  const [client, provider, agentSigner] = await ethers.getSigners();

  const mockAddr = process.env.USDC_ADDRESS;
  const escrowAddr = process.env.ESCROW_ADDRESS;

  const Mock = await ethers.getContractAt("MockUSDC", mockAddr);
  const Escrow = await ethers.getContractAt("TrustArcEscrow", escrowAddr);

  console.log("client", client.address);
  console.log("provider", provider.address);

  // Choose amount: 100 mUSDC with decimals=6 => 100 * 10^6
  const decimals = await Mock.decimals();
  const amount = ethers.parseUnits("100", decimals);

  // create an agreement id
  const id = ethers.id("agreement-1-" + Date.now());
  console.log("Agreement id:", id);

  // client creates agreement on chain
  let tx = await Escrow.connect(client).createAgreement(id, provider.address, amount);
  await tx.wait();
  console.log("Agreement created");

  // client approves transfer of MockUSDC to escrow
  tx = await Mock.connect(client).approve(escrowAddr, amount);
  await tx.wait();
  console.log("Approved");

  // client deposits
  tx = await Escrow.connect(client).deposit(id);
  await tx.wait();
  console.log("Deposited to escrow");

  // provider submits proof — call agent backend to verify and release
  const res = await fetch("http://localhost:3001/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ agreementId: id, proofText: "Task is done and complete" })
  });
  const body = await res.json();
  console.log("Agent response:", body);
}
main().catch((e) => { console.error(e); process.exit(1); });
