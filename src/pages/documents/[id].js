import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Layout from '../../components/layout/Layout';
import DocumentIcon from '../../components/documents/DocumentIcon';
import DownloadButton from '../../components/documents/DownloadButton';
import useDocument from '../../hooks/useDocument';
import { FaArrowLeft, FaSpinner, FaExclamationTriangle } from 'react-icons/fa';

export default function DocumentDetailsPage() {
  const router = useRouter();
  const { id } = router.query;
  
  const { document, isLoading, error, fetchDocument } = useDocument();
  
  // Fetch document when ID is available
  useEffect(() => {
    if (id) {
      fetchDocument(id);
    }
  }, [id, fetchDocument]);
  
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
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };
  
  // Loading state
  if (isLoading) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-[60vh]">
          <div className="flex flex-col items-center">
            <FaSpinner className="animate-spin text-primary-500 w-10 h-10 mb-4" />
            <p className="text-gray-600">Loading document details...</p>
          </div>
        </div>
      </Layout>
    );
  }
  
  // Error state
  if (error) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative my-6" role="alert">
              <div className="flex items-center">
                <FaExclamationTriangle className="text-red-500 mr-3" />
                <strong className="font-bold">Error: </strong>
                <span className="block sm:inline ml-1">{error}</span>
              </div>
              <div className="mt-4">
                <Link href="/search" className="text-red-700 underline">
                  Return to search
                </Link>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }
  
  // Document not found state
  if (!document) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded relative my-6" role="alert">
              <strong className="font-bold">Document not found: </strong>
              <span className="block sm:inline">The requested document could not be found.</span>
              <div className="mt-4">
                <Link href="/search" className="text-yellow-700 underline">
                  Return to search
                </Link>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }
  
  return (
    <Layout>
      <Head>
        <title>{document.title || document.filename} | Document Search App</title>
        <meta name="description" content={`View details for ${document.title || document.filename}`} />
      </Head>
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Back button */}
          <Link href="/search" className="inline-flex items-center text-gray-600 hover:text-primary-600 mb-6">
            <FaArrowLeft className="mr-2" />
            Back to search results
          </Link>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-start">
              {/* Document icon */}
              <div className="mr-6">
                <DocumentIcon type={document.filetype} size="lg" />
              </div>
              
              <div className="flex-1">
                {/* Document title */}
                <h1 className="text-2xl font-bold text-gray-800 mb-2">
                  {document.title || document.filename}
                </h1>
                
                {/* Document metadata */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 mt-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Filename:</span>{' '}
                    <span className="text-gray-600">{document.filename}</span>
                  </div>
                  
                  <div>
                    <span className="font-medium text-gray-700">File Type:</span>{' '}
                    <span className="text-gray-600">{document.filetype.toUpperCase()}</span>
                  </div>
                  
                  <div>
                    <span className="font-medium text-gray-700">File Size:</span>{' '}
                    <span className="text-gray-600">{formatFileSize(document.filesize)}</span>
                  </div>
                  
                  {document.author && (
                    <div>
                      <span className="font-medium text-gray-700">Author:</span>{' '}
                      <span className="text-gray-600">{document.author}</span>
                    </div>
                  )}
                  
                  {document.metadata?.created_date && (
                    <div>
                      <span className="font-medium text-gray-700">Created:</span>{' '}
                      <span className="text-gray-600">{formatDate(document.metadata.created_date)}</span>
                    </div>
                  )}
                  
                  {document.last_modified && (
                    <div>
                      <span className="font-medium text-gray-700">Modified:</span>{' '}
                      <span className="text-gray-600">{formatDate(document.last_modified)}</span>
                    </div>
                  )}
                  
                  <div>
                    <span className="font-medium text-gray-700">Uploaded:</span>{' '}
                    <span className="text-gray-600">{formatDate(document.upload_date)}</span>
                  </div>
                </div>
                
                {/* Keywords */}
                {document.metadata?.keywords && document.metadata.keywords.length > 0 && (
                  <div className="mt-4">
                    <h3 className="text-md font-medium text-gray-700 mb-2">Keywords</h3>
                    <div className="flex flex-wrap gap-2">
                      {document.metadata.keywords.map((keyword, index) => (
                        <span 
                          key={index}
                          className="bg-primary-100 text-primary-800 text-xs px-2 py-1 rounded-full"
                        >
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Summary */}
                {document.metadata?.summary && (
                  <div className="mt-6">
                    <h3 className="text-md font-medium text-gray-700 mb-2">Summary</h3>
                    <div className="bg-gray-50 p-4 rounded border border-gray-100">
                      <p className="text-gray-700">{document.metadata.summary}</p>
                    </div>
                  </div>
                )}
                
                {/* Document chunks */}
                {document.chunks && document.chunks.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-md font-medium text-gray-700 mb-2">Document Content</h3>
                    <div className="space-y-4">
                      {document.chunks.map((chunk, index) => (
                        <div key={index} className="bg-gray-50 p-4 rounded border border-gray-100">
                          <p className="text-gray-700 text-sm">{chunk.content}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Download button */}
                <div className="mt-6 flex justify-end">
                  <DownloadButton documentId={document.id} filename={document.filename} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
