// App.jsx - TrustArc Escrow Application Main Component
// AI-powered smart contract escrow system with automated verification

import React, { useState, useCallback, useMemo } from 'react';
import './app.css'; // Import external CSS file

// --- AI AGENT & LOGIC CONFIGURATION ---
// Status constants for AI verification workflow
// Defines all possible states in the escrow lifecycle
const AI_AGENT_STATUS = {
  PENDING: 'PENDING',              // Initial state, waiting for deposit
  ANALYZING: 'ANALYZING',          // AI is currently analyzing submission
  VERIFIED: 'VERIFIED',            // Work passed AI verification
  REJECTED: 'REJECTED',            // Work failed AI verification
  RELEASED: 'RELEASED',            // Funds released to freelancer
  RETURNED: 'RETURNED',            // Funds returned to client
  AWAITING_SUBMISSION: 'AWAITING_SUBMISSION', // Ready for work submission
  ERROR: 'ERROR',                  // System error occurred
};

// Platform fee configuration - dual-sided marketplace model
// Both client and freelancer pay 1% fees
const PLATFORM_FEE = {
  CLIENT_FEE: 0.01,        // 1% fee charged to client on top of escrow amount
  FREELANCER_FEE: 0.01,    // 1% fee deducted from freelancer's payment
};

// Backend URL configuration for AI verification API
// Uses environment variable with localhost fallback for development
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

// SVG Icon components for consistent UI
// All icons use currentColor for theme compatibility
const Icons = {
  // Loading spinner icon for async operations
  Loader: ({ className = "" }) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" className={className}>
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
    </svg>
  ),
  // Check mark icon for success states
  CheckCircle: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
      <polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  ),
  // Warning triangle icon for errors
  AlertTriangle: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  ),
  // Upload icon for file submission
  Upload: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="17 8 12 3 7 8"/>
      <line x1="12" y1="3" x2="12" y2="15"/>
    </svg>
  ),
  // File icon for document submissions
  FileText: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <polyline points="10 9 9 9 8 9"/>
    </svg>
  ),
  // X icon for rejection states
  XCircle: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <circle cx="12" cy="12" r="10"/>
      <line x1="15" y1="9" x2="9" y2="15"/>
      <line x1="9" y1="9" x2="15" y2="15"/>
    </svg>
  ),
  // Dollar sign icon for payment operations
  DollarSign: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <line x1="12" y1="1" x2="12" y2="23"/>
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
    </svg>
  ),
  // Users icon for client/freelancer relationships
  Users: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  // Shield icon for security features
  Shield: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  ),
  // Zap icon for AI/quick actions
  Zap: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  ),
};

// Main application component
const App = () => {
  // State management for escrow workflow
  
  // Escrow identification and financial state
  const [escrowId, setEscrowId] = useState(null);              // Unique escrow identifier
  const [escrowAmount, setEscrowAmount] = useState("");        // Amount to be escrowed
  const [aiAgentStatus, setAiAgentStatus] = useState(AI_AGENT_STATUS.PENDING); // Current AI status
  const [escrowBalance, setEscrowBalance] = useState(0);       // Current balance in escrow
  const [status, setStatus] = useState(null);                  // Temporary status messages
  
  // Work submission state
  const [file, setFile] = useState(null);                      // Uploaded work file
  const [taskDescription, setTaskDescription] = useState("");  // Task requirements description
  const [verificationResult, setVerificationResult] = useState(null); // AI verification results
  const [loading, setLoading] = useState(false);               // Loading state for async operations
  const [currentStep, setCurrentStep] = useState(1);           // Current workflow step (1-6)

  // Mock addresses for demo purposes
  // These are standard Hardhat test addresses
  const [clientAddress] = useState('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266');
  const [freelancerAddress] = useState('0x70997970C51812dc3A010C7d01b50e0d17dc79C8');

  // Reset status message after 5 seconds to clear temporary notifications
  const resetStatus = useCallback(() => {
    setTimeout(() => setStatus(null), 5000);
  }, []);

  // Calculate platform fees for transaction
  // Applies both client and freelancer fees to the escrow amount
  const calculateFees = useCallback((amount) => {
    const clientFee = amount * PLATFORM_FEE.CLIENT_FEE;
    const freelancerFee = amount * PLATFORM_FEE.FREELANCER_FEE;
    const totalFees = clientFee + freelancerFee;
    const freelancerReceives = amount - freelancerFee;
    const clientPays = amount + clientFee;

    return {
      clientFee,
      freelancerFee,
      totalFees,
      freelancerReceives,
      clientPays,
      rawAmount: amount
    };
  }, []);

  // Memoized fee breakdown based on escrow amount
  // Only recalculates when escrow amount changes
  const feeBreakdown = useMemo(() => {
    if (!escrowAmount || parseFloat(escrowAmount) <= 0) return null;
    return calculateFees(parseFloat(escrowAmount));
  }, [escrowAmount, calculateFees]);

  // Error handling utility function
  // Logs errors and shows user-friendly messages
  const handleError = useCallback((error, context) => {
    console.error(`Error in ${context}:`, error);
    const errorMessage = error.message || 'An unexpected error occurred';
    setStatus({ type: 'error', message: errorMessage });
    resetStatus();
  }, [resetStatus]);

  // Success message handler
  // Shows success notifications to user
  const handleSuccess = useCallback((message, context) => {
    console.log(`Success in ${context}:`, message);
    setStatus({ type: 'success', message });
    resetStatus();
  }, [resetStatus]);

  // Reset entire escrow workflow to initial state
  // Clears all state and prepares for new transaction
  const resetEscrow = useCallback(() => {
    setEscrowId(null);
    setEscrowBalance(0);
    setAiAgentStatus(AI_AGENT_STATUS.PENDING);
    setEscrowAmount("");
    setFile(null);
    setTaskDescription("");
    setVerificationResult(null);
    setCurrentStep(1);
    handleSuccess('Escrow reset. Ready for new transaction.', 'reset');
  }, [handleSuccess]);

  // Create new escrow agreement
  // Validates inputs and simulates blockchain transaction
  const handleCreateEscrow = useCallback(async () => {
    const amount = parseFloat(escrowAmount);

    // Validation checks
    if (amount <= 0) {
      setStatus({ type: 'error', message: "Amount must be greater than zero." });
      return;
    }

    if (!freelancerAddress) {
      setStatus({ type: 'error', message: "Please enter a freelancer address." });
      return;
    }

    setLoading(true);
    setStatus({ type: 'loading', message: 'Creating escrow contract...' });

    try {
      // Simulate blockchain transaction delay (2 seconds)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Generate random escrow ID for demo purposes
      const newEscrowId = Math.floor(Math.random() * 1000) + 1;
      setEscrowId(newEscrowId);
      setCurrentStep(2); // Move to deposit step
      
      handleSuccess(`Escrow #${newEscrowId} created successfully!`, 'escrow-creation');

    } catch (error) {
      handleError(error, 'Escrow creation');
    } finally {
      setLoading(false);
    }
  }, [escrowAmount, freelancerAddress, handleSuccess, handleError]);

  // Deposit funds into escrow
  // Simulates USDC deposit with platform fee application
  const handleDeposit = useCallback(async () => {
    if (escrowId === null) return;
    const amount = parseFloat(escrowAmount);

    setLoading(true);
    setStatus({ type: 'loading', message: 'Processing deposit with platform fee...' });

    try {
      // Simulate blockchain transaction
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Update state to reflect deposited funds
      setEscrowBalance(amount);
      setAiAgentStatus(AI_AGENT_STATUS.AWAITING_SUBMISSION);
      setEscrowAmount(""); // Clear input field
      setCurrentStep(3); // Move to work submission step
      
      handleSuccess(`Deposited ${amount.toFixed(2)} USDC successfully! (Including ${PLATFORM_FEE.CLIENT_FEE * 100}% platform fee)`, 'deposit');

    } catch (error) {
      handleError(error, 'Deposit');
    } finally {
      setLoading(false);
    }
  }, [escrowId, escrowAmount, handleSuccess, handleError]);

  // Handle file upload with validation
  // Validates file type and size before accepting
  const handleFileUpload = useCallback((e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    // File validation parameters
    const maxSize = 50 * 1024 * 1024; // 50MB limit
    const allowedTypes = [
      'application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed',
      'text/html', 'application/javascript', 'text/css', 'application/json',
      'text/csv', 'text/plain', 'video/mp4', 'video/quicktime', 'video/x-msvideo',
      'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    // File size validation
    if (selectedFile.size > maxSize) {
      setStatus({ type: 'error', message: 'File size exceeds 50MB limit' });
      return;
    }

    // File type validation (both MIME type and extension)
    if (!allowedTypes.includes(selectedFile.type) && !selectedFile.name.match(/\.(zip|rar|7z|html|js|css|json|csv|txt|mp4|mov|avi|pdf|doc|docx)$/i)) {
      setStatus({ type: 'error', message: 'File type not supported' });
      return;
    }

    // Accept valid file
    setFile(selectedFile);
    setStatus({ type: 'success', message: `File "${selectedFile.name}" selected successfully` });
  }, []);

  // Submit work for AI verification
  // Sends file and description to backend for analysis
  const submitForVerification = useCallback(async () => {
    // Validation: ensure all required fields are provided
    if (!file || !taskDescription.trim() || !escrowId) {
      setStatus({ type: 'error', message: "Please provide both a file and task description." });
      return;
    }

    setLoading(true);
    setAiAgentStatus(AI_AGENT_STATUS.ANALYZING);
    setStatus({ type: 'loading', message: 'Submitting work for AI verification...' });

    try {
      // Prepare form data for backend API
      const formData = new FormData();
      formData.append("submission", file);
      formData.append("taskDescription", taskDescription);
      formData.append("escrowId", escrowId.toString());
      formData.append("escrowAmount", escrowBalance.toString());

      // Call backend API for AI verification
      const response = await fetch(`${BACKEND_URL}/verify-and-release`, {
        method: "POST",
        body: formData,
      });

      // Handle HTTP errors
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();
      setVerificationResult(data);
      
      // Update status based on verification result
      if (data.success && data.status === "VERIFIED") {
        setAiAgentStatus(AI_AGENT_STATUS.VERIFIED);
        setCurrentStep(4);
        handleSuccess('AI verification successful! Ready to release payment.', 'ai-verification');
      } else if (data.status === "REJECTED") {
        setAiAgentStatus(AI_AGENT_STATUS.REJECTED);
        setCurrentStep(5);
        setStatus({ type: 'error', message: 'AI verification failed. Work did not meet requirements.' });
      } else {
        setAiAgentStatus(AI_AGENT_STATUS.ERROR);
        setStatus({ type: 'error', message: 'AI verification encountered an error.' });
      }

    } catch (error) {
      console.error("Verification failed:", error);
      
      // Fallback to demo mode if backend unavailable
      setStatus({ type: 'warning', message: 'Using demo mode: Simulating AI verification...' });
      
      // Simulate AI verification process (3 second delay)
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Demo mode: 80% success rate for testing
      const isSuccess = Math.random() > 0.2;
      const mockResult = {
        success: isSuccess,
        status: isSuccess ? "VERIFIED" : "REJECTED",
        confidenceScore: isSuccess ? 0.92 : 0.45,
        feedback: isSuccess 
          ? '✅ Work meets all specified requirements. Code quality is excellent, documentation is thorough, and all functionality requirements are implemented correctly.'
          : '❌ Work does not meet all requirements. Missing key deliverables and quality standards.',
        issues: isSuccess ? [] : ['Incomplete functionality', 'Missing documentation', 'Code quality below standards'],
        strengths: isSuccess ? ['Excellent code quality', 'Complete documentation', 'All requirements met'] : ['Good attempt at implementation'],
        feeBreakdown: isSuccess ? {
          platformFee: feeBreakdown?.totalFees || 20,
          freelancerReceives: feeBreakdown?.freelancerReceives || 980,
          clientPaid: feeBreakdown?.clientPays || 1020
        } : null
      };
      
      setVerificationResult(mockResult);
      
      // Update UI based on demo result
      if (isSuccess) {
        setAiAgentStatus(AI_AGENT_STATUS.VERIFIED);
        setCurrentStep(4);
        handleSuccess('AI verification successful! Ready to release payment.', 'ai-verification');
      } else {
        setAiAgentStatus(AI_AGENT_STATUS.REJECTED);
        setCurrentStep(5);
        setStatus({ type: 'error', message: 'AI verification failed. Work did not meet requirements.' });
      }
    } finally {
      setLoading(false);
      resetStatus();
    }
  }, [file, taskDescription, escrowId, escrowBalance, feeBreakdown, handleSuccess, resetStatus]);

  // Release payment to freelancer
  // Simulates blockchain transaction to release escrowed funds
  const handleReleasePayment = useCallback(async () => {
    // Only allow release if work is verified
    if (aiAgentStatus !== AI_AGENT_STATUS.VERIFIED) return;

    setLoading(true);
    setStatus({ type: 'loading', message: 'Releasing payment with platform fee...' });

    try {
      // Simulate blockchain transaction
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Update state to reflect released payment
      setAiAgentStatus(AI_AGENT_STATUS.RELEASED);
      setEscrowBalance(0);
      setCurrentStep(6); // Move to completion step
      
      const fees = calculateFees(escrowBalance);
      handleSuccess(`Payment released! Freelancer receives ${fees.freelancerReceives.toFixed(2)} USDC (${PLATFORM_FEE.FREELANCER_FEE * 100}% platform fee applied)`, 'payment-release');

    } catch (error) {
      handleError(error, 'Payment release');
    } finally {
      setLoading(false);
    }
  }, [aiAgentStatus, escrowBalance, calculateFees, handleSuccess, handleError]);

  // Return funds to client
  // Simulates blockchain transaction to return escrowed funds
  const handleReturnFunds = useCallback(async () => {
    // Only allow return if work is rejected
    if (aiAgentStatus !== AI_AGENT_STATUS.REJECTED) return;

    setLoading(true);
    setStatus({ type: 'loading', message: 'Returning funds...' });

    try {
      // Simulate blockchain transaction
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Update state to reflect returned funds
      setAiAgentStatus(AI_AGENT_STATUS.RETURNED);
      setEscrowBalance(0);
      setCurrentStep(6); // Move to completion step
      
      const fees = calculateFees(escrowBalance);
      handleSuccess(`Funds returned! Client receives ${(escrowBalance - fees.clientFee).toFixed(2)} USDC (${PLATFORM_FEE.CLIENT_FEE * 100}% platform fee retained)`, 'fund-return');

    } catch (error) {
      handleError(error, 'Fund return');
    } finally {
      setLoading(false);
    }
  }, [aiAgentStatus, escrowBalance, calculateFees, handleSuccess, handleError]);

  // UI state validation helpers
  // These determine when buttons should be disabled
  
  const isCreateDisabled = loading || parseFloat(escrowAmount) <= 0 || !freelancerAddress || (escrowId !== null && escrowBalance > 0);
  const isDepositDisabled = loading || escrowId === null || escrowBalance > 0 || parseFloat(escrowAmount) <= 0;
  const isReleaseDisabled = loading || aiAgentStatus !== AI_AGENT_STATUS.VERIFIED;
  const isReturnDisabled = loading || aiAgentStatus !== AI_AGENT_STATUS.REJECTED;
  const isSubmitDisabled = loading || !file || !taskDescription.trim() || aiAgentStatus !== AI_AGENT_STATUS.AWAITING_SUBMISSION;

  // AI status configuration for UI display
  // Maps status constants to color, text, and icon configurations
  const aiStatusConfig = useMemo(() => {
    const configs = {
      [AI_AGENT_STATUS.PENDING]: { 
        color: '#c0c0c0', 
        label: 'PENDING', 
        text: 'Waiting for Deposit', 
        icon: Icons.Loader 
      },
      [AI_AGENT_STATUS.AWAITING_SUBMISSION]: { 
        color: '#ffd700', 
        label: 'AWAITING WORK', 
        text: 'Ready for Work Submission', 
        icon: Icons.Upload 
      },
      [AI_AGENT_STATUS.ANALYZING]: { 
        color: '#ffa500', 
        label: 'ANALYZING', 
        text: 'AI Review in Progress', 
        icon: Icons.Loader 
      },
      [AI_AGENT_STATUS.VERIFIED]: { 
        color: '#00ff00', 
        label: 'VERIFIED', 
        text: 'Ready for Release', 
        icon: Icons.CheckCircle 
      },
      [AI_AGENT_STATUS.REJECTED]: { 
        color: '#ff4444', 
        label: 'REJECTED', 
        text: 'Ready for Return', 
        icon: Icons.XCircle 
      },
      [AI_AGENT_STATUS.RELEASED]: { 
        color: '#00ff88', 
        label: 'RELEASED', 
        text: 'Payment Completed', 
        icon: Icons.CheckCircle 
      },
      [AI_AGENT_STATUS.RETURNED]: { 
        color: '#8888ff', 
        label: 'RETURNED', 
        text: 'Funds Returned', 
        icon: Icons.DollarSign 
      },
      [AI_AGENT_STATUS.ERROR]: { 
        color: '#ff4444', 
        label: 'ERROR', 
        text: 'System Error', 
        icon: Icons.AlertTriangle 
      },
    };
    return configs[aiAgentStatus] || configs[AI_AGENT_STATUS.PENDING];
  }, [aiAgentStatus]);

  // Status display component
  // Shows temporary success/error/loading messages
  const StatusDisplay = () => {
    if (!status) return null;
    
    // Choose appropriate icon based on status type
    const StatusIcon = status.type === 'success' ? Icons.CheckCircle : 
                      status.type === 'error' ? Icons.AlertTriangle : 
                      Icons.Loader;

    return (
      <div className={`status-banner ${status.type}`}>
        <StatusIcon />
        <div className="status-content">
          <span>{status.message}</span>
        </div>
      </div>
    );
  };

  // Step indicator component for workflow visualization
  // Shows progress through the 6-step escrow process
  const StepIndicator = () => {
    const steps = [
      { number: 1, title: 'Create Escrow', completed: currentStep > 1 },
      { number: 2, title: 'Deposit Funds', completed: currentStep > 2 },
      { number: 3, title: 'Submit Work', completed: currentStep > 3 },
      { number: 4, title: 'AI Verification', completed: currentStep > 4 },
      { number: 5, title: 'Release/Return', completed: currentStep > 5 },
      { number: 6, title: 'Complete', completed: currentStep > 6 }
    ];

    return (
      <div className="step-indicator">
        {steps.map((step, index) => (
          <div key={step.number} className="step-item">
            <div className={`step-number ${step.completed ? 'completed' : ''} ${currentStep === step.number ? 'current' : ''}`}>
              {step.completed ? <Icons.CheckCircle /> : step.number}
            </div>
            <div className="step-title">{step.title}</div>
            {index < steps.length - 1 && <div className="step-connector"></div>}
          </div>
        ))}
      </div>
    );
  };

  // Main component render
  return (
    <div className="app-container">
      <div className="main-content">
        <div className="panel">
          {/* Application header */}
          <div className="header">
            <h1 className="title">TRUST ARC ESCROW</h1>
            <div className="subtitle">AI-Powered Smart Contract Escrow System</div>
            <div className="tagline">Secure • Automated • Intelligent Verification</div>
          </div>

          {/* Workflow step indicator */}
          <StepIndicator />
          
          {/* Status messages */}
          <StatusDisplay />

          {/* AI Status Card - shows current verification state */}
          <div className="ai-status-card" style={{ '--status-color': aiStatusConfig.color }}>
            <div className="ai-status-header">
              <div className="status-dot"></div>
              <div className="status-text">{aiStatusConfig.label}</div>
            </div>
            <div className="status-sub">{aiStatusConfig.text}</div>
          </div>

          {/* Demo notice - indicates this is a simulation */}
          <div className="demo-notice">
            <Icons.Shield /> 
            <strong>Demo Mode:</strong> This is a demonstration of the AI verification workflow. 
            Real blockchain transactions are simulated for testing purposes.
          </div>

          {/* Stats Grid - shows key metrics */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-label">Escrow Amount</div>
              <div>
                <span className="stat-value">${escrowBalance.toFixed(2)}</span>
                <span className="stat-currency">USDC</span>
              </div>
              <div className="stat-sub">
                {escrowId ? `Escrow #${escrowId}` : 'No active escrow'}
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-label">AI Confidence</div>
              <div>
                <span className="stat-value">
                  {verificationResult ? `${(verificationResult.confidenceScore * 100).toFixed(0)}%` : '--%'}
                </span>
              </div>
              <div className="stat-sub">
                {verificationResult ? 'Verification Score' : 'Awaiting analysis'}
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-label">Platform Fee</div>
              <div>
                <span className="stat-value">{PLATFORM_FEE.CLIENT_FEE * 100}%</span>
              </div>
              <div className="stat-sub">
                Each party
              </div>
            </div>
          </div>

          {/* Step 1: Create Escrow - initial setup */}
          {currentStep === 1 && (
            <div className="input-section">
              <div className="section-title">
                <Icons.Users />
                Step 1: Create Escrow Agreement
              </div>
              
              {/* Freelancer address input */}
              <div style={{marginBottom: '16px'}}>
                <div className="input-label">Freelancer Address</div>
                <input
                  type="text"
                  value={freelancerAddress}
                  className="address-input"
                  readOnly
                  style={{background: 'rgba(60, 60, 60, 0.8)'}}
                />
                <div style={{fontSize: '0.75rem', color: '#666', marginTop: '4px'}}>
                  Demo address pre-filled for testing
                </div>
              </div>

              {/* Escrow amount input */}
              <div className="input-label">Escrow Amount (USDC)</div>
              <div className="input-wrapper">
                <input
                  type="number"
                  value={escrowAmount}
                  onChange={(e) => setEscrowAmount(e.target.value)}
                  placeholder="1000.00"
                  className="amount-input"
                  disabled={loading}
                  min="1"
                  step="0.01"
                />
                <div className="currency-label">USDC</div>
              </div>

              {/* Fee breakdown display */}
              {feeBreakdown && (
                <div style={{marginTop: '16px', padding: '12px', background: 'rgba(50, 50, 50, 0.6)', borderRadius: '6px'}}>
                  <div style={{fontSize: '0.875rem', color: '#c0c0c0', marginBottom: '8px'}}>Fee Breakdown:</div>
                  <div style={{fontSize: '0.75rem', color: '#888'}}>
                    Client pays: <strong>${feeBreakdown.clientPays.toFixed(2)}</strong> (includes ${feeBreakdown.clientFee.toFixed(2)} fee)<br/>
                    Freelancer receives: <strong>${feeBreakdown.freelancerReceives.toFixed(2)}</strong> (after ${feeBreakdown.freelancerFee.toFixed(2)} fee)
                  </div>
                </div>
              )}

              {/* Create escrow button */}
              <button 
                onClick={handleCreateEscrow}
                disabled={isCreateDisabled}
                className="action-btn primary"
                style={{marginTop: '20px'}}
              >
                {loading ? (
                  <>
                    <Icons.Loader className="animate-spin" />
                    Creating Escrow...
                  </>
                ) : (
                  <>
                    <Icons.Shield />
                    Create Escrow Contract
                  </>
                )}
              </button>
            </div>
          )}

          {/* Step 2: Deposit Funds - funding the escrow */}
          {currentStep === 2 && (
            <div className="input-section">
              <div className="section-title">
                <Icons.DollarSign />
                Step 2: Deposit Escrow Funds
              </div>
              
              {/* Escrow info display */}
              <div style={{marginBottom: '20px', padding: '16px', background: 'rgba(50, 50, 50, 0.6)', borderRadius: '8px'}}>
                <div style={{fontSize: '0.875rem', color: '#c0c0c0'}}>Escrow Created:</div>
                <div style={{fontSize: '1rem', color: '#ffd700', fontFamily: 'Courier New, monospace'}}>
                  #{escrowId} • Amount: ${parseFloat(escrowAmount).toFixed(2)} USDC
                </div>
              </div>

              {/* Deposit button */}
              <button 
                onClick={handleDeposit}
                disabled={isDepositDisabled}
                className="action-btn primary"
              >
                {loading ? (
                  <>
                    <Icons.Loader className="animate-spin" />
                    Processing Deposit...
                  </>
                ) : (
                  <>
                    <Icons.DollarSign />
                    Deposit ${parseFloat(escrowAmount).toFixed(2)} USDC
                  </>
                )}
              </button>
            </div>
          )}

          {/* Step 3: Work Submission - freelancer submits work */}
          {currentStep === 3 && (
            <div className="work-submission-section">
              <div className="section-title">
                <Icons.Upload />
                Step 3: Submit Work for AI Verification
              </div>
              
              {/* Active escrow info */}
              <div style={{marginBottom: '20px', padding: '16px', background: 'rgba(50, 50, 50, 0.6)', borderRadius: '8px'}}>
                <div style={{fontSize: '0.875rem', color: '#c0c0c0'}}>Active Escrow:</div>
                <div style={{fontSize: '1rem', color: '#ffd700', fontFamily: 'Courier New, monospace'}}>
                  #{escrowId} • Escrowed: ${escrowBalance.toFixed(2)} USDC
                </div>
              </div>

              {/* File upload input */}
              <div className="input-label">Upload Work Files</div>
              <input
                type="file"
                onChange={handleFileUpload}
                className="file-input"
                accept=".zip,.rar,.7z,.html,.js,.css,.json,.csv,.txt,.mp4,.mov,.avi,.pdf,.doc,.docx"
              />
              
              {/* Task description input */}
              <div className="input-label">Task Description & Requirements</div>
              <textarea
                placeholder="Describe what this task should achieve. Be specific about requirements, deliverables, and success criteria. The AI will verify the submitted work against this description."
                value={taskDescription}
                onChange={(e) => setTaskDescription(e.target.value)}
                className="task-description"
              />

              {/* AI analysis progress indicator */}
              {aiAgentStatus === AI_AGENT_STATUS.ANALYZING && (
                <div className="ai-analysis-progress">
                  <Icons.Loader className="animate-spin" />
                  <div style={{marginTop: '8px'}}>
                    <strong>AI Analysis in Progress...</strong><br/>
                    Analyzing: File type, content quality, requirements match, code standards
                  </div>
                </div>
              )}
              
              {/* Submit for verification button */}
              <button 
                onClick={submitForVerification}
                disabled={isSubmitDisabled}
                className="action-btn submit"
              >
                {loading ? (
                  <>
                    <Icons.Loader className="animate-spin" />
                    AI Verification in Progress...
                  </>
                ) : (
                  <>
                    <Icons.Zap />
                    Submit for AI Verification
                  </>
                )}
              </button>
            </div>
          )}

          {/* Verification Results Display - shows AI analysis outcome */}
          {verificationResult && (
            <div className="verification-result">
              <div className="verification-header">
                <div style={{fontSize: '1.2rem', fontWeight: 'bold'}}>
                  AI Verification Result
                </div>
                <div className="verification-score">
                  <span>Confidence:</span>
                  <span className="score-value" style={{ '--score-color': verificationResult.success ? '#00ff00' : '#ff4444' }}>
                    {(verificationResult.confidenceScore * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
              
              {/* AI feedback */}
              <div className="verification-feedback">
                {verificationResult.feedback}
              </div>

              {/* Issues found */}
              {verificationResult.issues && verificationResult.issues.length > 0 && (
                <div>
                  <div style={{fontSize: '1rem', fontWeight: 'bold', color: '#ff6b6b', marginBottom: '8px'}}>
                    Issues Found:
                  </div>
                  <ul className="issues-list">
                    {verificationResult.issues.map((issue, index) => (
                      <li key={index}>{issue}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Strengths identified */}
              {verificationResult.strengths && verificationResult.strengths.length > 0 && (
                <div>
                  <div style={{fontSize: '1rem', fontWeight: 'bold', color: '#00ff00', marginBottom: '8px'}}>
                    Strengths:
                  </div>
                  <ul className="strengths-list">
                    {verificationResult.strengths.map((strength, index) => (
                      <li key={index}>{strength}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Payment breakdown for successful verification */}
              {verificationResult.feeBreakdown && (
                <div className="fee-breakdown">
                  <div style={{fontSize: '1rem', fontWeight: 'bold', marginBottom: '12px'}}>Payment Breakdown:</div>
                  <div className="fee-row">
                    <span>Platform Fee:</span>
                    <span>${verificationResult.feeBreakdown.platformFee.toFixed(2)} USDC</span>
                  </div>
                  <div className="fee-row">
                    <span>Freelancer Receives:</span>
                    <span>${verificationResult.feeBreakdown.freelancerReceives.toFixed(2)} USDC</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 4 & 5: Release/Return Actions - final fund distribution */}
          {(currentStep === 4 || currentStep === 5) && (
            <div className="actions-grid">
              <div className="action-row">
                {/* Release payment button (shown when verified) */}
                <button 
                  onClick={handleReleasePayment}
                  disabled={isReleaseDisabled}
                  className="action-btn success"
                >
                  {loading ? (
                    <Icons.Loader className="animate-spin" />
                  ) : (
                    <Icons.CheckCircle />
                  )}
                  Release Payment to Freelancer
                </button>
                
                {/* Return funds button (shown when rejected) */}
                <button 
                  onClick={handleReturnFunds}
                  disabled={isReturnDisabled}
                  className="action-btn danger"
                >
                  {loading ? (
                    <Icons.Loader className="animate-spin" />
                  ) : (
                    <Icons.XCircle />
                  )}
                  Return Funds to Client
                </button>
              </div>
            </div>
          )}

          {/* Step 6: Completion Screen - transaction finalized */}
          {currentStep === 6 && (
            <div style={{textAlign: 'center', padding: '40px 20px'}}>
              <Icons.CheckCircle style={{fontSize: '4rem', color: '#00ff00', marginBottom: '20px'}} />
              <div style={{fontSize: '2rem', color: '#00ff00', marginBottom: '16px'}}>
                Transaction Completed!
              </div>
              <div style={{fontSize: '1rem', color: '#c0c0c0', marginBottom: '32px'}}>
                {aiAgentStatus === AI_AGENT_STATUS.RELEASED 
                  ? 'Payment has been successfully released to the freelancer.'
                  : 'Funds have been successfully returned to the client.'
                }
              </div>
              {/* Reset button to start new escrow */}
              <button 
                onClick={resetEscrow}
                className="action-btn primary"
                style={{margin: '0 auto'}}
              >
                Start New Escrow
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;