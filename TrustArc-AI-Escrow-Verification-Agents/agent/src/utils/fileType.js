// Import the path module from Node.js for file path operations
import path from "path";

/**
 * Detects the type of file based on its extension
 * Categorizes files into common types for processing and validation
 * 
 * @param {string} filePath - The path or filename to analyze (e.g., "document.pdf", "/files/video.mp4")
 * @returns {string} - The detected file type category:
 *   - "video" for video files
 *   - "document" for documents and text files  
 *   - "code" for source code files
 *   - "dataset" for data files
 *   - "image" for image files
 *   - "website" for web files and archives
 *   - "unknown" for unsupported file types
 * 
 * @example
 * // Returns "document"
 * detectFileType("report.pdf");
 * 
 * @example  
 * // Returns "code"
 * detectFileType("/projects/script.js");
 * 
 * @example
 * // Returns "unknown"
 * detectFileType("file.xyz");
 */
export function detectFileType(filePath) {
  // Extract the file extension and convert to lowercase for consistent comparison
  // path.extname() returns the extension including the dot (e.g., ".mp4", ".pdf")
  const ext = path.extname(filePath).toLowerCase();

  // Check for video file extensions
  // MP4: Most common video format, good compatibility
  // MOV: Apple QuickTime format, common for professional video
  if ([".mp4", ".mov"].includes(ext)) return "video";

  // Check for document file extensions  
  // PDF: Portable Document Format, universal document sharing
  // DOCX: Microsoft Word document format
  // TXT: Plain text files, simple document format
  if ([".pdf", ".docx", ".txt"].includes(ext)) return "document";

  // Check for source code file extensions
  // JS: JavaScript files for web development
  // SOL: Solidity files for smart contract development  
  // PY: Python files for general programming and scripting
  if ([".js", ".sol", ".py"].includes(ext)) return "code";

  // Check for dataset file extensions
  // CSV: Comma-separated values, common data exchange format
  // JSON: JavaScript Object Notation, structured data format
  if ([".csv", ".json"].includes(ext)) return "dataset";

  // Check for image file extensions
  // PNG: Portable Network Graphics, lossless image format
  // JPG/JPEG: Joint Photographic Experts Group, common photo format
  if ([".png", ".jpg", ".jpeg"].includes(ext)) return "image";

  // Check for website-related file extensions
  // HTML: HyperText Markup Language, web page structure
  // ZIP: Compressed archive, often used for website bundles
  if ([".html", ".zip"].includes(ext)) return "website";

  // Return "unknown" for any file extensions not in the supported list
  // This helps handle unsupported formats gracefully
  return "unknown";
}