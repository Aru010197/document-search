import React, { useState } from 'react';
import { FaDownload, FaSpinner } from 'react-icons/fa';

/**
 * Component to download a document
 * 
 * @param {Object} props
 * @param {string} props.documentId - The document ID
 * @param {string} props.filename - The document filename
 * @param {string} props.className - Additional CSS classes
 * @returns {JSX.Element}
 */
export default function DownloadButton({ documentId, filename, className = '' }) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const handleDownload = async () => {
    if (!documentId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Get the download URL
      const response = await fetch(`/api/documents/${documentId}/download`);
      
      if (!response.ok) {
        throw new Error(`Failed to get download URL: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.url) {
        throw new Error('Download URL not available');
      }
      
      // Create a temporary link and trigger the download
      const link = document.createElement('a');
      link.href = data.url;
      link.download = filename || `document-${documentId}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Download error:', err);
      setError(err.message || 'Failed to download document');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className={className}>
      <button
        onClick={handleDownload}
        disabled={isLoading}
        className="inline-flex items-center px-3 py-1.5 border border-primary-300 text-sm leading-5 font-medium rounded-md text-primary-700 bg-white hover:bg-primary-50 focus:outline-none focus:border-primary-400 focus:shadow-outline-primary active:bg-primary-100 transition duration-150 ease-in-out"
        title="Download document"
      >
        {isLoading ? (
          <FaSpinner className="animate-spin mr-1.5" />
        ) : (
          <FaDownload className="mr-1.5" />
        )}
        Download
      </button>
      
      {error && (
        <p className="mt-1 text-xs text-red-600">{error}</p>
      )}
    </div>
  );
}
