import Link from 'next/link';
import DocumentIcon from '../documents/DocumentIcon';
import DownloadButton from '../documents/DownloadButton';
import HighlightedText from './HighlightedText';
import { FaSpinner, FaSearch, FaExclamationTriangle } from 'react-icons/fa';

/**
 * Component to display search results
 * 
 * @param {Object} props
 * @param {Array} props.results - Array of search results
 * @param {boolean} props.isLoading - Whether search is in progress
 * @param {string} props.query - Search query
 * @param {Object} props.pagination - Pagination information
 * @param {Function} props.onPageChange - Function to call when page changes
 * @param {string} props.error - Error message, if any
 * @param {string} props.className - Additional CSS classes
 * @returns {JSX.Element}
 */
export default function SearchResults({ 
  results, 
  isLoading, 
  query, 
  pagination, 
  onPageChange,
  error,
  className = ''
}) {
  // Loading state
  if (isLoading) {
    return (
      <div className={`flex justify-center my-8 ${className}`}>
        <div className="flex flex-col items-center">
          <FaSpinner className="animate-spin text-primary-500 w-10 h-10 mb-4" />
          <p className="text-gray-600">Searching documents...</p>
        </div>
      </div>
    );
  }
  
  // Error state
  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-6 my-8 ${className}`}>
        <div className="flex items-center mb-4">
          <FaExclamationTriangle className="text-red-500 w-6 h-6 mr-3" />
          <h3 className="text-lg font-medium text-red-800">Search Error</h3>
        </div>
        <p className="text-red-700 mb-4">{error}</p>
        <p className="text-red-600 text-sm">
          Please try again or adjust your search query.
        </p>
      </div>
    );
  }

  // Empty results state
  if (!results || results.length === 0) {
    return (
      <div className={`bg-white rounded-lg shadow p-8 text-center my-8 ${className}`}>
        <div className="flex justify-center mb-4">
          <FaSearch className="text-gray-400 w-12 h-12" />
        </div>
        <h3 className="text-lg font-medium text-gray-700 mb-2">No documents found</h3>
        <p className="text-gray-600 mb-2">No documents match your search criteria.</p>
        <p className="text-gray-500 text-sm">Try adjusting your search terms or filters.</p>
      </div>
    );
  }

  // Helper function to format file size
  const formatFileSize = (bytes) => {
    if (!bytes && bytes !== 0) return 'Unknown';
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB';
    else return (bytes / 1073741824).toFixed(1) + ' GB';
  };

  // Helper function to format date
  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  // Calculate pagination display values
  const startItem = pagination ? (pagination.page - 1) * pagination.limit + 1 : 1;
  const endItem = pagination ? Math.min(pagination.page * pagination.limit, pagination.total) : results.length;
  const totalItems = pagination ? pagination.total : results.length;

  return (
    <div className={`space-y-4 my-4 ${className}`}>
      {/* Results count */}
      <p className="text-sm text-gray-600">
        Showing {startItem} to {endItem} of {totalItems} results
        {query && <span> for "<strong>{query}</strong>"</span>}
      </p>
      
      {/* Results list */}
      <div className="space-y-4">
        {results.map((document) => (
          <div 
            key={document.id} 
            className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow duration-200"
          >
            <div className="flex items-start">
              {/* File type icon */}
              <div className="mr-4 flex-shrink-0">
                <DocumentIcon type={document.filetype} />
              </div>
              
              <div className="flex-1">
                {/* Document title */}
                <Link href={`/documents/${document.document_id}`} className="text-lg font-medium text-primary-700 hover:text-primary-900">
                  {document.title || document.filename}
                </Link>
                
                {/* Document metadata */}
                <div className="mt-1 text-sm text-gray-600 flex flex-wrap gap-x-4">
                  <span>Type: {document.filetype.toUpperCase()}</span>
                  {document.filesize && <span>Size: {formatFileSize(document.filesize)}</span>}
                  {document.author && <span>Author: {document.author}</span>}
                  <span>Uploaded: {formatDate(document.upload_date)}</span>
                </div>
                
                {/* Relevance score */}
                {document.score && (
                  <div className="mt-1">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-100 text-primary-800">
                      Relevance: {Math.round(document.score * 100)}%
                    </span>
                  </div>
                )}
                
                {/* Document snippet */}
                {document.snippet && (
                  <div className="mt-2 bg-gray-50 p-3 rounded border border-gray-100">
                    <p className="text-gray-700 text-sm">
                      <HighlightedText text={document.snippet} highlight={query} />
                    </p>
                  </div>
                )}
                
                {/* Download button */}
                <div className="mt-3 flex justify-end">
                  <DownloadButton documentId={document.document_id} filename={document.filename} />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex justify-center mt-8">
          <nav className="flex items-center space-x-2">
            <button
              onClick={() => onPageChange(Math.max(1, pagination.page - 1))}
              disabled={pagination.page === 1}
              className="px-3 py-1 rounded border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Previous page"
            >
              Previous
            </button>
            
            {[...Array(pagination.totalPages)].map((_, i) => {
              const pageNumber = i + 1;
              const isCurrentPage = pageNumber === pagination.page;
              
              // Only show a few page numbers around the current page
              if (
                pageNumber === 1 ||
                pageNumber === pagination.totalPages ||
                (pageNumber >= pagination.page - 1 && pageNumber <= pagination.page + 1)
              ) {
                return (
                  <button
                    key={pageNumber}
                    onClick={() => onPageChange(pageNumber)}
                    className={`px-3 py-1 rounded ${
                      isCurrentPage
                        ? 'bg-primary-500 text-white'
                        : 'border border-gray-300 text-gray-600 hover:bg-gray-50'
                    }`}
                    aria-label={`Page ${pageNumber}`}
                    aria-current={isCurrentPage ? 'page' : undefined}
                  >
                    {pageNumber}
                  </button>
                );
              }
              
              // Show ellipsis for skipped pages
              if (
                (pageNumber === 2 && pagination.page > 3) ||
                (pageNumber === pagination.totalPages - 1 && pagination.page < pagination.totalPages - 2)
              ) {
                return <span key={pageNumber} className="px-2">...</span>;
              }
              
              return null;
            })}
            
            <button
              onClick={() => onPageChange(Math.min(pagination.totalPages, pagination.page + 1))}
              disabled={pagination.page === pagination.totalPages}
              className="px-3 py-1 rounded border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Next page"
            >
              Next
            </button>
          </nav>
        </div>
      )}
    </div>
  );
}
