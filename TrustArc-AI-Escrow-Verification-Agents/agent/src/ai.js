// agent/src/ai.js
// AI Verification Module for TrustArc Platform
// Analyzes task submissions using rule-based AI and provides verification results
// Handles file analysis, content validation, and business logic for escrow releases

// Import required dependencies
import fs from 'fs'; // File system operations
import path from 'path'; // Path utilities for file handling

/**
 * Platform Fee Configuration
 * Matches frontend configuration for consistency
 * Dual-sided marketplace model: Both client and freelancer pay fees
 */
const PLATFORM_FEE = {
  CLIENT_FEE: 0.01, // 1% from client (on top of escrow amount)
  FREELANCER_FEE: 0.01, // 1% from freelancer (deducted from escrow amount)
};

/**
 * Main AI Verification Function
 * Analyzes task submissions against requirements and determines if funds should be released
 * @param {string} taskDescription - Description of the task requirements
 * @param {string} filePath - Path to the submitted file
 * @param {number} escrowAmount - Amount in escrow (for fee calculations)
 * @returns {Promise<Object>} Verification result with confidence score and detailed analysis
 */
export const verifyTask = async (taskDescription, filePath, escrowAmount = 0) => {
  console.log(`\n🤖 AI Analysis Starting...`);
  console.log(`📝 Task Description: "${taskDescription}"`);
  console.log(`📁 File Path: ${filePath}`);
  console.log(`💰 Escrow Amount: ${escrowAmount} mUSDC`);
  
  try {
    // Step 1: Basic Input Validation
    if (!taskDescription || !filePath) {
      console.log('❌ Missing task description or file');
      return {
        verified: false,
        confidenceScore: 0,
        feedback: "Missing task description or file",
        issues: ["No file uploaded or description provided"],
        fileType: "unknown",
        strengths: [],
        feeBreakdown: calculateFeeBreakdown(escrowAmount)
      };
    }

    // Step 2: File Analysis - Read and analyze the submitted file
    let fileContent = '';
    let fileType = 'unknown';
    let fileSize = 0;
    let fileName = '';
    
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      const fileExtension = path.extname(filePath).toLowerCase();
      fileSize = stats.size;
      fileName = path.basename(filePath);
      
      console.log(`📊 File Analysis:`);
      console.log(`   - Name: ${fileName}`);
      console.log(`   - Size: ${(fileSize / 1024).toFixed(2)} KB`);
      console.log(`   - Extension: ${fileExtension}`);
      
      // Determine file type category
      fileType = getFileType(fileExtension);
      
      // Read content for text-based files only
      if (isTextFile(fileExtension)) {
        try {
          fileContent = fs.readFileSync(filePath, 'utf8');
          console.log(`   - Content Preview: ${fileContent.substring(0, 200).replace(/\n/g, ' ')}...`);
        } catch (readError) {
          console.log(`   - Could not read file content: ${readError.message}`);
        }
      } else {
        console.log(`   - Binary file detected, analyzing metadata only`);
      }
    } else {
      console.log('❌ File not found');
      return {
        verified: false,
        confidenceScore: 0,
        feedback: "Uploaded file not found or inaccessible",
        issues: ["File was uploaded but cannot be accessed"],
        fileType: "unknown",
        strengths: [],
        feeBreakdown: calculateFeeBreakdown(escrowAmount)
      };
    }

    // Step 3: Core Analysis - Compare submission against requirements
    const analysisResult = analyzeSubmission(taskDescription, fileType, fileContent, fileSize, fileName);
    
    console.log(`📈 AI Confidence Score: ${analysisResult.confidenceScore}`);
    console.log(`✅ Verification Result: ${analysisResult.verified ? 'PASS' : 'FAIL'}`);
    console.log(`📋 Issues Found: ${analysisResult.issues.length > 0 ? analysisResult.issues.join(', ') : 'None'}`);
    console.log(`💪 Strengths: ${analysisResult.strengths.length > 0 ? analysisResult.strengths.join(', ') : 'None'}`);
    
    // Step 4: Return Complete Result with Fee Information
    return {
      ...analysisResult,
      feeBreakdown: calculateFeeBreakdown(escrowAmount)
    };
    
  } catch (error) {
    // Step 5: Error Handling - Catch any unexpected errors
    console.error('🚨 AI Analysis Error:', error);
    return {
      verified: false,
      confidenceScore: 0,
      feedback: "AI analysis failed due to system error",
      issues: ["System error during analysis"],
      fileType: "unknown",
      strengths: [],
      feeBreakdown: calculateFeeBreakdown(escrowAmount)
    };
  }
};

/**
 * Calculate Fee Breakdown for Business Model
 * Provides transparent fee calculation for both parties
 * @param {number} amount - Raw escrow amount
 * @returns {Object|null} Detailed fee breakdown or null if invalid amount
 */
const calculateFeeBreakdown = (amount) => {
  if (!amount || amount <= 0) return null;
  
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
    rawAmount: amount,
    clientFeePercent: PLATFORM_FEE.CLIENT_FEE * 100,
    freelancerFeePercent: PLATFORM_FEE.FREELANCER_FEE * 100
  };
};

/**
 * File Type Classification
 * Maps file extensions to human-readable categories
 * @param {string} extension - File extension including dot (e.g., '.html')
 * @returns {string} File type category
 */
const getFileType = (extension) => {
  const typeMap = {
    // Web Development
    '.html': 'webpage',
    '.htm': 'webpage',
    '.js': 'javascript',
    '.css': 'stylesheet',
    '.json': 'data',
    
    // Text and Data
    '.txt': 'text',
    '.md': 'markdown',
    '.csv': 'spreadsheet',
    
    // Video Files
    '.mp4': 'video',
    '.mov': 'video',
    '.avi': 'video',
    '.mkv': 'video',
    '.wmv': 'video',
    
    // Documents
    '.pdf': 'document',
    '.doc': 'document',
    '.docx': 'document',
    
    // Archives
    '.zip': 'archive',
    '.rar': 'archive',
    '.7z': 'archive',
    '.tar': 'archive',
    '.gz': 'archive',
    
    // Images
    '.png': 'image',
    '.jpg': 'image',
    '.jpeg': 'image',
    '.gif': 'image',
    '.svg': 'image',
    '.bmp': 'image'
  };
  return typeMap[extension] || 'unknown';
};

/**
 * Text File Detection
 * Determines if a file is text-based and can be read as UTF-8
 * @param {string} extension - File extension including dot
 * @returns {boolean} True if file is text-based
 */
const isTextFile = (extension) => {
  const textExtensions = ['.html', '.htm', '.js', '.css', '.json', '.txt', '.md', '.csv', '.xml'];
  return textExtensions.includes(extension);
};

/**
 * Core Analysis Logic - Rule-Based AI
 * Compares submission against task requirements using weighted scoring
 * @param {string} description - Task description/requirements
 * @param {string} fileType - Type of submitted file
 * @param {string} content - File content (for text files)
 * @param {number} fileSize - File size in bytes
 * @param {string} fileName - Original filename
 * @returns {Object} Complete analysis result
 */
const analyzeSubmission = (description, fileType, content, fileSize, fileName) => {
  // Initialize scoring system
  let confidenceScore = 0.7; // Start with neutral score (0.7 = 70%)
  const issues = []; // Problems found
  const strengths = []; // Positive aspects found
  
  // Convert description to lowercase for case-insensitive matching
  const descLower = description.toLowerCase();
  
  // ===== FILE TYPE MATCHING CHECKS (HIGH IMPACT) =====
  
  // Check for obvious mismatches between description and file type
  if (descLower.includes('video') && fileType !== 'video') {
    issues.push('Description mentions video but submitted file is not a video file');
    confidenceScore -= 0.5; // High penalty for major mismatch
  } else if (descLower.includes('video') && fileType === 'video') {
    strengths.push('Correctly submitted video file as requested');
    confidenceScore += 0.2; // Reward for correct file type
  }
  
  if ((descLower.includes('website') || descLower.includes('webpage') || descLower.includes('html')) && !['webpage', 'html'].includes(fileType)) {
    issues.push('Description mentions website but submitted file is not a webpage');
    confidenceScore -= 0.4;
  } else if ((descLower.includes('website') || descLower.includes('webpage')) && ['webpage', 'html'].includes(fileType)) {
    strengths.push('Correctly submitted webpage file as requested');
    confidenceScore += 0.2;
  }
  
  if (descLower.includes('image') && fileType !== 'image') {
    issues.push('Description mentions image but submitted file is not an image');
    confidenceScore -= 0.4;
  } else if (descLower.includes('image') && fileType === 'image') {
    strengths.push('Correctly submitted image file as requested');
    confidenceScore += 0.2;
  }
  
  // Additional file type checks...
  if (descLower.includes('document') && fileType !== 'document') {
    issues.push('Description mentions document but submitted file is not a document');
    confidenceScore -= 0.3;
  } else if (descLower.includes('document') && fileType === 'document') {
    strengths.push('Correctly submitted document file as requested');
    confidenceScore += 0.2;
  }
  
  if (descLower.includes('code') && !['javascript', 'webpage'].includes(fileType)) {
    issues.push('Description mentions code but submitted file is not a code file');
    confidenceScore -= 0.3;
  }
  
  // ===== CONTENT REQUIREMENT CHECKS (MEDIUM IMPACT) =====
  
  // Check for responsive design requirements
  if (descLower.includes('responsive') && fileType === 'webpage') {
    const hasResponsiveMeta = content.includes('viewport') || content.includes('responsive') || content.includes('@media') || content.includes('mobile');
    if (!hasResponsiveMeta) {
      issues.push('Website should be responsive but no responsive design elements found');
      confidenceScore -= 0.2;
    } else {
      strengths.push('Responsive design elements detected');
      confidenceScore += 0.1;
    }
  }
  
  // JavaScript functionality checks
  if (descLower.includes('javascript') && fileType === 'webpage' && !content.includes('script')) {
    issues.push('JavaScript mentioned but no scripts found in webpage');
    confidenceScore -= 0.2;
  } else if (descLower.includes('javascript') && fileType === 'javascript') {
    strengths.push('JavaScript file submitted as expected');
    confidenceScore += 0.1;
  }
  
  // Form element checks
  if (descLower.includes('form') && fileType === 'webpage' && !content.includes('<form')) {
    issues.push('Form required but no form elements found');
    confidenceScore -= 0.15;
  } else if (descLower.includes('form') && fileType === 'webpage' && content.includes('<form')) {
    strengths.push('Form elements detected in webpage');
    confidenceScore += 0.1;
  }
  
  // ===== WEBPAGE QUALITY CHECKS (LOW IMPACT) =====
  
  if (fileType === 'webpage') {
    // Validate basic HTML structure
    const htmlChecks = {
      'Missing HTML doctype': !content.includes('<!DOCTYPE'),
      'Missing HTML tag': !content.includes('<html'),
      'Missing head section': !content.includes('<head'),
      'Missing body section': !content.includes('<body'),
      'Missing title tag': !content.includes('<title')
    };
    
    let htmlIssues = 0;
    Object.entries(htmlChecks).forEach(([issue, check]) => {
      if (check) {
        issues.push(issue);
        htmlIssues++;
        confidenceScore -= 0.05; // Small penalty per structural issue
      }
    });
    
    if (htmlIssues === 0) {
      strengths.push('Proper HTML structure detected');
      confidenceScore += 0.1;
    }
    
    // Check for common HTML elements
    if (content.includes('<div') || content.includes('<span') || content.includes('<p')) {
      strengths.push('Standard HTML elements present');
      confidenceScore += 0.05;
    }
  }

  // ===== JAVASCRIPT QUALITY CHECKS =====
  
  if (fileType === 'javascript') {
    if (content.length > 100) {
      strengths.push('Substantial JavaScript code provided');
      confidenceScore += 0.1;
    }
    
    if (content.includes('function') || content.includes('=>')) {
      strengths.push('Functions/methods implemented');
      confidenceScore += 0.05;
    }
  }

  // ===== FILE SIZE APPROPRIATENESS CHECKS =====
  
  if (fileType === 'video' && fileSize < 1000000) { // Less than 1MB for video
    issues.push('Video file seems too small for a complete video (less than 1MB)');
    confidenceScore -= 0.2;
  } else if (fileType === 'video' && fileSize > 1000000) {
    strengths.push('Video file size appears appropriate');
    confidenceScore += 0.1;
  }
  
  if (fileType === 'webpage' && fileSize < 100) { // Less than 100 bytes for HTML
    issues.push('Webpage file seems too small to contain meaningful content');
    confidenceScore -= 0.1;
  } else if (fileType === 'webpage' && fileSize > 500) {
    strengths.push('Substantial webpage content provided');
    confidenceScore += 0.05;
  }
  
  // ===== SPECIFIC CONTENT REQUIREMENT CHECKS =====
  
  if (descLower.includes('contact') && fileType === 'webpage' && !content.includes('contact') && !content.includes('email') && !content.includes('phone')) {
    issues.push('Contact information mentioned but no contact details found');
    confidenceScore -= 0.1;
  }
  
  if (descLower.includes('navigation') && fileType === 'webpage' && !content.includes('nav') && !content.includes('menu') && !content.includes('href')) {
    issues.push('Navigation required but no navigation elements found');
    confidenceScore -= 0.1;
  }

  // ===== QUALITY AND COMPLETENESS INDICATORS =====
  
  if (fileType === 'webpage') {
    if (content.includes('</html>') && content.includes('</body>')) {
      strengths.push('Webpage appears to be complete and properly closed');
      confidenceScore += 0.05;
    }
    
    if (content.includes('<!--') && content.includes('-->')) {
      strengths.push('Code includes comments for better maintainability');
      confidenceScore += 0.05;
    }
  }

  // Quality assessment based on content length and structure
  if (fileType === 'webpage' && content.length > 1000) {
    strengths.push('Comprehensive webpage with substantial content');
    confidenceScore += 0.1;
  }
  
  if (fileType === 'document' && fileSize > 50000) {
    strengths.push('Substantial document provided');
    confidenceScore += 0.1;
  }

  // ===== FINAL SCORE CALCULATION AND VERDICT =====
  
  // Ensure score stays within 0.0 - 1.0 range
  confidenceScore = Math.max(0, Math.min(1, confidenceScore));
  
  // Determine verification result (threshold: 60% confidence, max 3 issues)
  const verified = confidenceScore >= 0.6 && issues.length <= 3;
  
  // Generate human-readable feedback based on score and findings
  let feedback = "";
  if (verified) {
    if (confidenceScore >= 0.8) {
      feedback = "Excellent work! The submission perfectly matches the requirements. ";
    } else if (confidenceScore >= 0.7) {
      feedback = "Good work! The submission meets the requirements with minor notes. ";
    } else {
      feedback = "Acceptable work. The submission meets the basic requirements. ";
    }
    
    if (strengths.length > 0) {
      feedback += strengths.join('. ') + ". ";
    }
    if (issues.length > 0) {
      feedback += "Minor issues noted but overall acceptable.";
    } else {
      feedback += "All requirements satisfied.";
    }
  } else {
    if (confidenceScore < 0.3) {
      feedback = "Significant issues detected. The submission does not match the requirements. ";
    } else if (confidenceScore < 0.5) {
      feedback = "Multiple issues found. The submission needs substantial improvements. ";
    } else {
      feedback = "Some requirements not met. The submission needs improvements. ";
    }
    
    if (issues.length > 0) {
      feedback += "Key issues: " + issues.join(', ') + ". ";
    }
    feedback += "Please review the task specifications and resubmit.";
  }
  
  // Return comprehensive analysis result
  return {
    verified,
    confidenceScore: Math.round(confidenceScore * 100) / 100, // Round to 2 decimal places
    issues,
    strengths,
    fileType,
    analysis: `Analyzed ${fileType} file (${fileName}) against: "${description}"`,
    feedback,
    businessMetrics: {
      qualityScore: confidenceScore,
      recommendation: verified ? "APPROVE_PAYMENT" : "REJECT_SUBMISSION",
      estimatedProcessingTime: "2-5 seconds"
    }
  };
};

/**
 * Enhanced Detailed Verification Function
 * Provides additional analysis layers for complex tasks
 * @param {string} taskDescription - Task requirements
 * @param {string} filePath - Submitted file path
 * @param {number} escrowAmount - Escrow amount
 * @returns {Promise<Object>} Enhanced verification result with detailed analysis
 */
export const verifyTaskDetailed = async (taskDescription, filePath, escrowAmount = 0) => {
  const basicResult = await verifyTask(taskDescription, filePath, escrowAmount);
  
  // Add more detailed analysis here for premium features
  const detailedAnalysis = {
    descriptionLength: taskDescription.length,
    requirementsMatched: basicResult.verified ? 'Most requirements met' : 'Requirements not fully met',
    suggestedImprovements: basicResult.issues,
    qualityIndicators: basicResult.strengths,
    overallAssessment: basicResult.confidenceScore >= 0.8 ? 'High Quality' : 
                      basicResult.confidenceScore >= 0.6 ? 'Acceptable' : 'Needs Improvement',
    platformRevenue: basicResult.feeBreakdown ? {
      perTransaction: basicResult.feeBreakdown.totalFees,
      estimatedMonthly: basicResult.feeBreakdown.totalFees * 100, // Assuming 100 transactions/month
      businessModel: "Dual-sided marketplace (1% client + 1% freelancer)"
    } : null
  };
  
  return {
    ...basicResult,
    detailedAnalysis
  };
};

/**
 * Business Analytics and Reporting
 * Generates business intelligence from verification history
 * @param {Array} verificationResults - Array of previous verification results
 * @returns {Object} Business metrics and recommendations
 */
export const generateBusinessReport = (verificationResults = []) => {
  const totalTransactions = verificationResults.length;
  const successfulVerifications = verificationResults.filter(r => r.verified).length;
  const successRate = totalTransactions > 0 ? (successfulVerifications / totalTransactions) * 100 : 0;
  
  const totalPlatformRevenue = verificationResults.reduce((sum, result) => {
    return sum + (result.feeBreakdown?.totalFees || 0);
  }, 0);
  
  const averageTransactionValue = verificationResults.reduce((sum, result) => {
    return sum + (result.feeBreakdown?.rawAmount || 0);
  }, 0) / totalTransactions || 0;
  
  return {
    businessMetrics: {
      totalTransactions,
      successfulVerifications,
      successRate: Math.round(successRate * 100) / 100,
      totalPlatformRevenue: Math.round(totalPlatformRevenue * 100) / 100,
      averageTransactionValue: Math.round(averageTransactionValue * 100) / 100,
      estimatedMonthlyRevenue: Math.round(totalPlatformRevenue * 30), // 30-day projection
      platformCut: "2% total (1% client + 1% freelancer)"
    },
    qualityMetrics: {
      averageConfidenceScore: verificationResults.reduce((sum, r) => sum + r.confidenceScore, 0) / totalTransactions || 0,
      commonIssues: getCommonIssues(verificationResults),
      topStrengths: getTopStrengths(verificationResults)
    },
    recommendations: {
      pricing: "Current 2% total fee is competitive (vs Upwork's 20%)",
      scaling: "Consider volume discounts for enterprise clients",
      features: "Add premium verification tiers for complex projects"
    }
  };
};

/**
 * Helper: Analyze Common Issues Across Verifications
 * Identifies recurring problems for quality improvement
 * @param {Array} results - Verification results
 * @returns {Array} Top 5 common issues with counts
 */
const getCommonIssues = (results) => {
  const allIssues = results.flatMap(r => r.issues || []);
  const issueCounts = allIssues.reduce((acc, issue) => {
    acc[issue] = (acc[issue] || 0) + 1;
    return acc;
  }, {});
  
  return Object.entries(issueCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([issue, count]) => ({ issue, count }));
};

/**
 * Helper: Analyze Top Strengths Across Verifications
 * Identifies common strengths for marketing insights
 * @param {Array} results - Verification results
 * @returns {Array} Top 5 strengths with counts
 */
const getTopStrengths = (results) => {
  const allStrengths = results.flatMap(r => r.strengths || []);
  const strengthCounts = allStrengths.reduce((acc, strength) => {
    acc[strength] = (acc[strength] || 0) + 1;
    return acc;
  }, {});
  
  return Object.entries(strengthCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([strength, count]) => ({ strength, count }));
};

/**
 * File Type Validation Utility
 * Validates that submitted file matches expected types
 * @param {string} filePath - Path to submitted file
 * @param {Array} expectedTypes - Array of expected file type categories
 * @returns {Object} Validation result with details
 */
export const validateFileType = (filePath, expectedTypes) => {
  if (!fs.existsSync(filePath)) {
    return { valid: false, error: 'File not found' };
  }
  
  const extension = path.extname(filePath).toLowerCase();
  const actualType = getFileType(extension);
  
  const isValid = expectedTypes.includes(actualType);
  
  return {
    valid: isValid,
    actualType,
    expectedTypes,
    error: isValid ? null : `Expected ${expectedTypes.join(' or ')}, got ${actualType}`
  };
};

/**
 * Platform Revenue Calculator
 * Projects business revenue based on transaction volume
 * @param {number} transactionVolume - Monthly transaction count
 * @param {number} averageTransactionSize - Average escrow amount
 * @returns {Object} Revenue projections and metrics
 */
export const calculatePlatformRevenue = (transactionVolume, averageTransactionSize) => {
  const monthlyTransactions = transactionVolume;
  const monthlyVolume = monthlyTransactions * averageTransactionSize;
  const platformRevenue = monthlyVolume * (PLATFORM_FEE.CLIENT_FEE + PLATFORM_FEE.FREELANCER_FEE);
  
  return {
    monthlyTransactions,
    monthlyVolume: Math.round(monthlyVolume * 100) / 100,
    platformRevenue: Math.round(platformRevenue * 100) / 100,
    revenuePerTransaction: Math.round(platformRevenue / monthlyTransactions * 100) / 100,
    feeStructure: `${PLATFORM_FEE.CLIENT_FEE * 100}% client + ${PLATFORM_FEE.FREELANCER_FEE * 100}% freelancer = ${(PLATFORM_FEE.CLIENT_FEE + PLATFORM_FEE.FREELANCER_FEE) * 100}% total`
  };
};

// Export helper functions for testing and external use
export { getFileType, isTextFile, analyzeSubmission, calculateFeeBreakdown };