// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockUSDC is ERC20 {
    constructor() ERC20("Mock USDC", "mUSDC") {
        // Mint 1,000,000 mock USDC to the deployer (with 6 decimals)
        _mint(msg.sender, 1_000_000 * 10 ** uint256(decimals()));
    }

    // ✅ Override decimals to match real USDC (6 decimals, not 18)
    function decimals() public pure override returns (uint8) {
        return 6;
    }

    // Optional faucet to mint more tokens for testing
    function faucet(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
