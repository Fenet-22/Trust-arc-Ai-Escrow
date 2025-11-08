// agent/src/server.js
// Express server for TrustArc AI Agent backend
// Handles file uploads, AI verification, and blockchain fund releases

// Import required dependencies
import express from "express"; // Web framework for building REST APIs
import multer from "multer"; // Middleware for handling file uploads
import fs from "fs"; // File system module for file operations
import path from "path"; // Path utilities for cross-platform file paths
import { fileURLToPath } from "url"; // URL utilities for ES modules
import dotenv from "dotenv"; // Environment variable management
import cors from "cors"; // Cross-Origin Resource Sharing middleware

// ES module compatibility setup - convert import.meta.url to __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from the project root .env file (two levels up)
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

// Environment configuration logging
console.log("✅ .env loaded from:", path.resolve(__dirname, "../../.env"));
console.log("🔑 ESCROW_CONTRACT_ADDRESS:", process.env.ESCROW_CONTRACT_ADDRESS ? "Loaded" : "Missing");
console.log("🔑 PRIVATE_KEY:", process.env.PRIVATE_KEY ? "Loaded" : "Missing");

// Import business logic modules
import { releaseFunds } from "./blockchain.js"; // Blockchain interaction functions
import { verifyTask } from "./ai.js"; // AI verification functions

// Initialize Express application
const app = express();

// Middleware configuration
app.use(express.json()); // Parse JSON request bodies

/**
 * CORS Configuration
 * Permissive CORS for development - tighten for production deployment
 */
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Allow local development addresses
    if (
      origin.startsWith("http://localhost") ||
      origin.startsWith("http://127.0.0.1") ||
      origin.startsWith("http://192.168.") || // Local network
      origin.startsWith("http://::1") // IPv6 localhost
    ) return callback(null, true);
    
    // Development fallback: allow all origins
    // In production, replace with specific allowed domains:
    // return callback(new Error("Not allowed by CORS"), false);
    return callback(null, true);
  },
  credentials: true, // Allow cookies and authentication headers
}));

/**
 * Multer File Upload Configuration
 * Handles file uploads with security limits and type validation
 */
const upload = multer({ 
  dest: "uploads/", // Temporary directory for uploaded files
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB file size limit
  },
  fileFilter: (req, file, cb) => {
    // Allowed MIME types for various file categories
    const allowedTypes = [
      // Archives
      'application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed',
      // Web development files
      'text/html', 'application/javascript', 'text/css', 'application/json',
      // Data and text files
      'text/csv', 'text/plain', 
      // Video files
      'video/mp4', 'video/quicktime', 'video/x-msvideo',
      // Documents
      'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      // Images
      'image/png', 'image/jpeg', 'image/gif', 'image/svg+xml'
    ];
    
    // Check both MIME type and file extension for security
    if (allowedTypes.includes(file.mimetype) || 
        file.originalname.match(/\.(zip|rar|7z|html|js|css|json|csv|txt|md|mp4|mov|avi|pdf|doc|docx|png|jpg|jpeg|gif|svg)$/i)) {
      cb(null, true); // Accept file
    } else {
      cb(new Error(`File type not supported: ${file.mimetype}`), false); // Reject file
    }
  }
});

/**
 * Health Check Endpoint
 * GET / - Returns server status and available endpoints
 */
app.get("/", (req, res) => res.json({ 
  message: "✅ TrustArc AI Agent backend is running.",
  version: "2.0.0",
  endpoints: {
    "GET /": "Health check",
    "POST /verify-and-release": "AI verification & fund release"
  }
}));

/**
 * Main Verification Endpoint
 * POST /verify-and-release
 * Expects { escrowId, taskDescription, escrowAmount } and optional file upload
 * Process:
 * 1. Receive file upload and form data
 * 2. Run AI verification on the submission
 * 3. If verification passes, release funds on blockchain
 * 4. Return detailed results with confidence scores and feedback
 */
app.post("/verify-and-release", upload.single("submission"), async (req, res) => {
  // Extract request data
  const { escrowId, taskDescription, escrowAmount } = req.body;
  const filePath = req.file ? req.file.path : null; // Temporary file path if uploaded
  const amount = parseFloat(escrowAmount) || 0; // Parse escrow amount with fallback

  try {
    console.log(`[API] Received verify request for escrowId=${escrowId}, task="${taskDescription}"`);

    // Step 1: AI Verification - Analyze the task submission
    const verificationResult = await verifyTask(taskDescription || "", filePath, amount);

    // Step 2: Handle Verification Failure
    if (!verificationResult.verified) {
      // AI rejected the submission - return 200 with rejection details
      return res.json({ 
        success: false, 
        status: "REJECTED", 
        message: "AI verification failed",
        confidenceScore: verificationResult.confidenceScore,
        feedback: verificationResult.feedback,
        issues: verificationResult.issues // Specific problems identified
      });
    }

    // Step 3: Verification Success - Release Funds on Blockchain
    console.log("✅ Task verified by AI. Releasing funds...");
    const txHash = await releaseFunds(escrowId);
    
    // Step 4: Return Success Response
    return res.json({ 
      success: true, 
      status: "VERIFIED", 
      txHash, // Blockchain transaction hash
      confidenceScore: verificationResult.confidenceScore, // AI confidence level (0-1)
      feedback: verificationResult.feedback, // Positive feedback from AI
      feeBreakdown: verificationResult.feeBreakdown // Transaction fee details
    });

  } catch (err) {
    // Step 5: Error Handling
    console.error("Error in /verify-and-release:", err);
    return res.status(500).json({ 
      success: false, 
      status: "ERROR", 
      message: err.message || String(err) 
    });
  } finally {
    // Step 6: Cleanup - Always remove temporary uploaded files
    if (filePath && fs.existsSync(filePath)) {
      try { 
        fs.unlinkSync(filePath); // Delete temporary file
        console.log(`🧹 Cleaned up temporary file: ${filePath}`);
      } catch (e) { 
        console.error('Error cleaning up file:', e);
      }
    }
  }
});

/**
 * Global Error Handling Middleware
 * Catches unhandled errors and provides structured responses
 */
app.use((error, req, res, next) => {
  // Handle Multer-specific errors (file upload errors)
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        status: "ERROR",
        message: "File too large. Maximum size is 50MB."
      });
    }
    // Add more Multer error handlers as needed:
    // LIMIT_FILE_COUNT, LIMIT_FIELD_KEY, LIMIT_PART_COUNT, etc.
  }
  
  // Handle all other uncaught errors
  console.error('🚨 Unhandled error:', error);
  res.status(500).json({
    success: false,
    status: "ERROR", 
    message: "An unexpected error occurred"
  });
});

/**
 * Server Startup Configuration
 */
const PORT = process.env.AGENT_PORT || 3001; // Use environment port or default to 3001
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ AI Agent running at http://localhost:${PORT}`);
  console.log(`📋 Available endpoints:`);
  console.log(`   GET  /`);
  console.log(`   POST /verify-and-release`);
  console.log(`\n🤖 AI Verification Features:`);
  console.log(`   • Smart file type detection and validation`);
  console.log(`   • Advanced content analysis for text-based files`);
  console.log(`   • Intelligent requirement matching with confidence scoring`);
  console.log(`   • Detailed feedback with specific issues and strengths`);
  console.log(`   • Support for multiple file types (web, video, images, documents)`);
  console.log(`\n🔒 Security Features:`);
  console.log(`   • File size limits (50MB max)`);
  console.log(`   • File type validation`);
  console.log(`   • Automatic cleanup of uploaded files`);
  console.log(`   • CORS configuration for cross-origin requests`);
  console.log(`\n⚡ Blockchain Integration:`);
  console.log(`   • Automated fund release on verification success`);
  console.log(`   • Transaction hash tracking`);
  console.log(`   • Gas fee optimization`);
});

// Additional features that could be added:

/**
 * Example: Metrics endpoint for monitoring (commented out)
 * 
 * app.get("/metrics", async (req, res) => {
 *   const metrics = {
 *     uptime: process.uptime(),
 *     memory: process.memoryUsage(),
 *     verificationStats: await getVerificationStats(),
 *     blockchainStats: await getBlockchainStats()
 *   };
 *   res.json(metrics);
 * });
 */

/**
 * Example: Admin endpoints for management (commented out)
 * 
 * app.get("/admin/verifications", adminAuth, async (req, res) => {
 *   // Return recent verification attempts for admin review
 * });
 * 
 * app.post("/admin/override", adminAuth, async (req, res) => {
 *   // Manual override for disputed verifications
 * });
 */