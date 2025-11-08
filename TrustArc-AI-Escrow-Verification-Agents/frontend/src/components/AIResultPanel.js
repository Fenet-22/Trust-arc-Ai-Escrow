// AI Result Panel Component - Displays verification results
export default function AIResultPanel({ result }) {
  // Don't render anything if no result provided
  if (!result) return null;
  
  return (
    <div className="ai-panel">
      <h3>AI Verification Result</h3>
      {/* Main result message */}
      <p>{result.message}</p>
      
      {/* Show detailed analysis if available */}
      {result.details && <pre>{result.details}</pre>}
    </div>
  );
}