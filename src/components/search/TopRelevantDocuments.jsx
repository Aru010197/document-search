import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import DocumentIcon from '../documents/DocumentIcon';
import { FaCalendarAlt, FaFileAlt } from 'react-icons/fa';

/**
 * Component to display top relevant documents
 */
export default function TopRelevantDocuments({ 
  topic = 'latest documents', 
  limit = 5,
  title = 'Top Documents' 
}) {
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const fetchTopDocuments = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        console.log(`Fetching top documents for topic: "${topic}"`);
        const response = await fetch(
          `/api/top-relevant-documents?query=${encodeURIComponent(topic)}&limit=${limit}`
        );
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMessage = errorData.error || `Error ${response.status}: ${response.statusText}`;
          throw new Error(errorMessage);
        }
        
        const data = await response.json();
        console.log(`Received ${data.documents?.length || 0} documents for topic: "${topic}"`);
        setDocuments(data.documents || []);
      } catch (err) {
        console.error(`Error fetching top documents for "${topic}":`, err);
        setError(err.message);
        
        // If we have fewer than 3 retries, try again after a delay
        if (retryCount < 2) {
          console.log(`Retrying (${retryCount + 1}/2) after 2 seconds...`);
          setTimeout(() => {
            setRetryCount(prev => prev + 1);
          }, 2000);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchTopDocuments();
  }, [topic, limit, retryCount]);

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
  };

  if (isLoading) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-md">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">{title}</h2>
        <div className="animate-pulse">
          {[...Array(limit)].map((_, i) => (
            <div key={i} className="mb-4 flex">
              <div className="h-12 w-12 bg-gray-200 rounded-md mr-4"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-100 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-md">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">{title}</h2>
        <div className="bg-red-50 border border-red-200 rounded p-4">
          <p className="text-red-600 mb-2">Error loading documents: {error}</p>
          <button 
            onClick={handleRetry}
            className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 text-sm rounded transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-md">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">{title}</h2>
        <p className="text-gray-500 flex items-center">
          <FaFileAlt className="mr-2 text-gray-400" />
          No documents found for this topic
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">{title}</h2>
      <ul className="space-y-4">
        {documents.map((doc) => (
          <li key={doc.document_id} className="border-b pb-3 last:border-b-0">
            <Link href={`/documents/${doc.document_id}`} className="flex group">
              <div className="flex-shrink-0 mr-4">
                <DocumentIcon type={doc.filetype} size="md" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-md font-medium text-primary-700 group-hover:text-primary-900 truncate">
                  {doc.title}
                </h3>
                <div className="text-sm text-gray-600 flex items-center gap-2">
                  <span>{doc.filetype?.toUpperCase() || 'Unknown'}</span>
                  {!doc.isRecent && (
                    <span className="flex items-center">
                      • Relevance: {Math.round(doc.similarity * 100)}%
                    </span>
                  )}
                  {doc.isRecent && (
                    <span className="flex items-center text-primary-600">
                      <FaCalendarAlt className="mr-1" size={12} />
                      Recently Added
                    </span>
                  )}
                </div>
                {doc.snippet && (
                  <div className="mt-1 text-sm text-gray-500 line-clamp-2" 
                    dangerouslySetInnerHTML={{ __html: doc.snippet }} />
                )}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}