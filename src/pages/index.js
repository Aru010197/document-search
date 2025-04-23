import Head from 'next/head';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/layout/Layout';
import DocumentIcon from '../components/documents/DocumentIcon';
import { FaSearch, FaUpload, FaFileAlt, FaFilter } from 'react-icons/fa';

export default function HomePage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  
  // Handle search form submission
  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?query=${encodeURIComponent(searchQuery.trim())}`);
    }
  };
  
  return (
    <Layout>
      <Head>
        <title>Document Search App | Search through your documents</title>
        <meta name="description" content="Search through your documents with powerful filters and contextual results" />
      </Head>
      
      {/* Hero section */}
      <div className="bg-gradient-to-b from-primary-50 to-white">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Search Your Documents with Ease
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Powerful document search with context-aware results across multiple file formats.
            </p>
            
            {/* Quick search form */}
            <form onSubmit={handleSearch} className="max-w-2xl mx-auto mb-8">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaSearch className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full pl-10 pr-20 py-3 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-primary-500 focus:border-primary-500 sm:text-lg"
                  placeholder="Search documents..."
                  aria-label="Search documents"
                />
                <div className="absolute inset-y-0 right-0 flex items-center">
                  <button
                    type="submit"
                    className="px-4 py-2 mr-1 bg-primary-600 text-white rounded-r-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    Search
                  </button>
                </div>
              </div>
            </form>
            
            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link
                href="/search"
                className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                <FaSearch className="mr-2" />
                Advanced Search
              </Link>
              <Link
                href="/upload"
                className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-primary-700 bg-primary-100 hover:bg-primary-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                <FaUpload className="mr-2" />
                Upload Document
              </Link>
            </div>
          </div>
        </div>
      </div>
      
      {/* Features section */}
      <div className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Powerful Document Search Features
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow duration-300">
              <div className="flex items-center mb-4">
                <div className="bg-primary-100 p-3 rounded-full mr-4">
                  <FaFileAlt className="h-6 w-6 text-primary-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-800">Multi-format Support</h3>
              </div>
              <p className="text-gray-600">
                Search across PDF, Word, PowerPoint, and Excel documents with a unified interface.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <DocumentIcon type="pdf" size="sm" />
                <DocumentIcon type="doc" size="sm" />
                <DocumentIcon type="ppt" size="sm" />
                <DocumentIcon type="xls" size="sm" />
              </div>
            </div>
            
            {/* Feature 2 */}
            <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow duration-300">
              <div className="flex items-center mb-4">
                <div className="bg-primary-100 p-3 rounded-full mr-4">
                  <FaSearch className="h-6 w-6 text-primary-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-800">Contextual Search</h3>
              </div>
              <p className="text-gray-600">
                Find what you're looking for with context-aware results that understand the meaning behind your queries.
              </p>
              <div className="mt-4 bg-gray-50 p-3 rounded border border-gray-100">
                <p className="text-gray-700 text-sm">
                  <span className="bg-primary-100 text-primary-800 px-0.5 rounded">Search terms</span> are highlighted with surrounding context for better understanding.
                </p>
              </div>
            </div>
            
            {/* Feature 3 */}
            <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow duration-300">
              <div className="flex items-center mb-4">
                <div className="bg-primary-100 p-3 rounded-full mr-4">
                  <FaFilter className="h-6 w-6 text-primary-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-800">Advanced Filtering</h3>
              </div>
              <p className="text-gray-600">
                Narrow down results with powerful filters by file type, date, author, and more.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                  File Type
                </span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                  Date Range
                </span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                  Author
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* CTA section */}
      <div className="bg-primary-700 py-12">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-6">
            Ready to start searching your documents?
          </h2>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              href="/search"
              className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-primary-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-primary-700 focus:ring-white"
            >
              Search now →
            </Link>
            <Link
              href="/upload"
              className="inline-flex items-center justify-center px-6 py-3 border border-white text-base font-medium rounded-md text-white hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-primary-700 focus:ring-white"
            >
              Upload now →
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
}
