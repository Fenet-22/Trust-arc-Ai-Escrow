// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title IERC20Decimals Interface
 * @dev Interface for ERC20 tokens with decimals function
 * Includes core ERC20 functions plus decimals() for proper token handling
 */
interface IERC20Decimals {
    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function decimals() external view returns (uint8);
}

/**
 * @title TrustArcEscrow
 * @dev A smart contract for handling escrow services between clients and freelancers
 * Supports ERC20 tokens with proper decimal handling for secure payment escrow
 */
contract TrustArcEscrow {
    // State variables
    address public owner; // Contract owner/admin address
    IERC20Decimals public token; // ERC20 token contract interface

    uint256 public escrowCounter; // Counter for generating unique escrow IDs

    /**
     * @dev Escrow status enumeration
     * None: Escrow created but no funds deposited
     * Deposited: Client has deposited funds into escrow
     * Released: Funds released to freelancer (work completed)
     * Refunded: Funds returned to client (work not completed/cancelled)
     */
    enum Status {
        None,
        Deposited,
        Released,
        Refunded
    }

    /**
     * @dev Escrow structure storing all escrow details
     * client: Address of the client who creates and funds the escrow
     * freelancer: Address of the freelancer who will receive payment
     * amount: Amount of tokens in escrow (in token's smallest units)
     * status: Current status of the escrow from Status enum
     * exists: Flag to check if escrow ID is valid
     */
    struct Escrow {
        address client;
        address freelancer;
        uint256 amount; // in token smallest unit
        Status status;
        bool exists;
    }

    // Mapping from escrow ID to Escrow struct
    mapping(uint256 => Escrow) public escrows;

    // Events that match your app.jsx expectations
    event EscrowCreated(
        uint256 indexed escrowId,
        address indexed client,
        address indexed freelancer,
        uint256 amount
    );
    event FundsDeposited(uint256 indexed escrowId, uint256 amount);
    event PaymentReleased(uint256 indexed escrowId, uint256 amount);
    event FundsReturned(uint256 indexed escrowId, uint256 amount);

    /**
     * @dev Modifier to restrict function access to contract owner only
     */
    modifier onlyOwner() {
        require(msg.sender == owner, "only owner");
        _;
    }

    /**
     * @dev Modifier to check if escrow exists for given ID
     * @param escrowId The ID of the escrow to check
     */
    modifier escrowExists(uint256 escrowId) {
        require(escrows[escrowId].exists, "escrow does not exist");
        _;
    }

    /**
     * @dev Constructor initializes the contract with token address
     * @param tokenAddress Address of the ERC20 token to be used for escrow
     */
    constructor(address tokenAddress) {
        owner = msg.sender;
        token = IERC20Decimals(tokenAddress);
        escrowCounter = 0;
    }

    /**
     * @dev Create a new escrow agreement - matches your app.jsx createEscrow function
     * @param freelancer Address of the freelancer who will receive payment
     * @param amount Amount of tokens to be escrowed (in token's smallest units)
     * @return escrowId The newly created escrow ID
     */
    function createEscrow(
        address freelancer,
        uint256 amount
    ) external returns (uint256) {
        require(freelancer != address(0), "invalid freelancer");
        require(amount > 0, "amount must be greater than 0");
        require(
            freelancer != msg.sender,
            "client and freelancer cannot be the same"
        );

        uint256 escrowId = escrowCounter;
        escrowCounter++;

        escrows[escrowId] = Escrow({
            client: msg.sender,
            freelancer: freelancer,
            amount: amount,
            status: Status.None,
            exists: true
        });

        emit EscrowCreated(escrowId, msg.sender, freelancer, amount);
        return escrowId;
    }

    /**
     * @dev Deposit funds into an existing escrow - matches your app.jsx depositFunds function
     * Transfers tokens from client to contract for escrow
     * @param escrowId The ID of the escrow to fund
     */
    function depositFunds(uint256 escrowId) external escrowExists(escrowId) {
        Escrow storage e = escrows[escrowId];
        require(e.status == Status.None, "already deposited or completed");
        require(msg.sender == e.client, "only client can deposit");

        // Transfer tokens from client to contract
        bool success = token.transferFrom(msg.sender, address(this), e.amount);
        require(success, "token transfer failed");

        e.status = Status.Deposited;

        emit FundsDeposited(escrowId, e.amount);
    }

    /**
     * @dev Release payment to freelancer - matches your app.jsx releasePayment function
     * Can only be called by contract owner (admin) when work is completed
     * @param escrowId The ID of the escrow to release funds from
     */
    function releasePayment(
        uint256 escrowId
    ) external onlyOwner escrowExists(escrowId) {
        Escrow storage e = escrows[escrowId];
        require(e.status == Status.Deposited, "not in deposited state");

        e.status = Status.Released;

        // Transfer tokens to freelancer
        bool success = token.transfer(e.freelancer, e.amount);
        require(success, "token transfer to freelancer failed");

        emit PaymentReleased(escrowId, e.amount);
    }

    /**
     * @dev Return funds to client - matches your app.jsx returnFunds function
     * Can only be called by contract owner (admin) for refunds
     * @param escrowId The ID of the escrow to refund
     */
    function returnFunds(
        uint256 escrowId
    ) external onlyOwner escrowExists(escrowId) {
        Escrow storage e = escrows[escrowId];
        require(e.status == Status.Deposited, "not in deposited state");

        e.status = Status.Refunded;

        // Return tokens to client
        bool success = token.transfer(e.client, e.amount);
        require(success, "token return to client failed");

        emit FundsReturned(escrowId, e.amount);
    }

    /**
     * @dev Get escrow details - matches your app.jsx getEscrowDetails function
     * @param escrowId The ID of the escrow to query
     * @return client Address of the client
     * @return freelancer Address of the freelancer
     * @return amount Amount of tokens in escrow
     * @return statusValue Numerical representation of status
     * @return isDeposited True if funds are deposited
     * @return isCompleted True if escrow is completed (released or refunded)
     */
    function getEscrowDetails(
        uint256 escrowId
    )
        external
        view
        escrowExists(escrowId)
        returns (
            address client,
            address freelancer,
            uint256 amount,
            uint256 statusValue,
            bool isDeposited,
            bool isCompleted
        )
    {
        Escrow storage e = escrows[escrowId];
        client = e.client;
        freelancer = e.freelancer;
        amount = e.amount;
        statusValue = uint256(e.status);
        isDeposited = (e.status == Status.Deposited);
        isCompleted = (e.status == Status.Released ||
            e.status == Status.Refunded);
    }

    /**
     * @dev Get contract balance (useful for UI)
     * @return Current balance of this contract in the escrow token
     */
    function getContractBalance() external view returns (uint256) {
        return token.balanceOf(address(this));
    }

    /**
     * @dev Emergency withdrawal (only owner)
     * @param to Address to withdraw tokens to
     * @param amount Amount of tokens to withdraw
     */
    function emergencyWithdraw(address to, uint256 amount) external onlyOwner {
        bool success = token.transfer(to, amount);
        require(success, "emergency withdrawal failed");
    }

    /**
     * @dev Update token address (only owner)
     * @param newTokenAddress New ERC20 token contract address
     */
    function setTokenAddress(address newTokenAddress) external onlyOwner {
        token = IERC20Decimals(newTokenAddress);
    }

    /**
     * @dev Transfer ownership (only owner)
     * @param newOwner Address of the new owner
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "invalid new owner");
        owner = newOwner;
    }
}
