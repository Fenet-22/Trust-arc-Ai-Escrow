// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) external returns (bool);
    function transfer(
        address recipient,
        uint256 amount
    ) external returns (bool);
}

/**
 * @title AI Escrow Contract
 * @notice Holds client funds in USDC until verification is completed.
 */
contract Escrow {
    address public owner; // platform owner
    IERC20 public usdcToken;

    struct Deal {
        address client;
        address freelancer;
        uint256 amount;
        bool isReleased;
        bool isRefunded;
    }

    uint256 public dealCount;
    mapping(uint256 => Deal) public deals;

    event DealCreated(
        uint256 indexed dealId,
        address indexed client,
        address indexed freelancer,
        uint256 amount
    );
    event FundsReleased(uint256 indexed dealId, address indexed freelancer);
    event FundsRefunded(uint256 indexed dealId, address indexed client);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not authorized");
        _;
    }

    constructor(address _usdcToken) {
        owner = msg.sender;
        usdcToken = IERC20(_usdcToken);
    }

    /**
     * @dev Client creates an escrow for a freelancer.
     */
    function createEscrow(address _freelancer, uint256 _amount) external {
        require(_amount > 0, "Amount must be > 0");

        // Transfer USDC from client to contract
        require(
            usdcToken.transferFrom(msg.sender, address(this), _amount),
            "USDC transfer failed"
        );

        dealCount++;
        deals[dealCount] = Deal({
            client: msg.sender,
            freelancer: _freelancer,
            amount: _amount,
            isReleased: false,
            isRefunded: false
        });

        emit DealCreated(dealCount, msg.sender, _freelancer, _amount);
    }

    /**
     * @dev Platform (owner) releases payment to freelancer after verification.
     */
    function releaseFunds(uint256 _dealId) external onlyOwner {
        Deal storage deal = deals[_dealId];
        require(!deal.isReleased, "Already released");
        require(!deal.isRefunded, "Already refunded");

        deal.isReleased = true;
        require(
            usdcToken.transfer(deal.freelancer, deal.amount),
            "USDC transfer failed"
        );

        emit FundsReleased(_dealId, deal.freelancer);
    }

    /**
     * @dev Platform (owner) refunds client if verification fails.
     */
    function refundClient(uint256 _dealId) external onlyOwner {
        Deal storage deal = deals[_dealId];
        require(!deal.isReleased, "Already released");
        require(!deal.isRefunded, "Already refunded");

        deal.isRefunded = true;
        require(
            usdcToken.transfer(deal.client, deal.amount),
            "USDC transfer failed"
        );

        emit FundsRefunded(_dealId, deal.client);
    }
}
