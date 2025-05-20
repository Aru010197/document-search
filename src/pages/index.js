import React from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/layout/Layout';
import SearchForm from '../components/search/SearchForm';
import { FaSearch, FaRobot, FaFileAlt, FaChartBar, FaMobileAlt } from 'react-icons/fa';

export default function Home() {
  const router = useRouter();

  // Handle search submission by redirecting to search page
  const handleSearch = (query, useReranker = false) => {
    router.push({
      pathname: '/search',
      query: { 
        query,
        useReranker: useReranker.toString()
      }
    });
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero section */}
        <div className="py-12 md:py-20 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Document Search<span className="text-primary-600">.</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            Discover the power of AI-enhanced semantic search for your documents
          </p>
          
          {/* Search form with onSearch handler */}
          <div className="max-w-2xl mx-auto">
            <SearchForm onSearch={handleSearch} />
          </div>
        </div>
        
        {/* Features section */}
        <div className="py-12 bg-gradient-to-b from-white to-primary-50 rounded-xl shadow-sm">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">Powerful Features</h2>
            <p className="mt-2 text-xl text-gray-600">Discover what makes our document search unique</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1: AI-Enhanced Search */}
            <div className="bg-white rounded-lg shadow-md p-6 transform hover:scale-105 transition duration-300">
              <div className="rounded-full bg-primary-100 w-12 h-12 flex items-center justify-center mb-4">
                <FaRobot className="text-primary-600 w-6 h-6" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">AI-Enhanced Search</h3>
              <p className="text-gray-600">
                Our advanced semantic search understands context and meaning, not just keywords. 
                Find precisely what you're looking for, even with conversational queries.
              </p>
            </div>
            
            {/* Feature 2: Document Understanding */}
            <div className="bg-white rounded-lg shadow-md p-6 transform hover:scale-105 transition duration-300">
              <div className="rounded-full bg-primary-100 w-12 h-12 flex items-center justify-center mb-4">
                <FaFileAlt className="text-primary-600 w-6 h-6" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Deep Document Understanding</h3>
              <p className="text-gray-600">
                We analyze and understand your documents at a deep level, extracting key insights and 
                relationships between concepts for better search results.
              </p>
            </div>
            
            {/* Feature 3: Analytics & Insights */}
            <div className="bg-white rounded-lg shadow-md p-6 transform hover:scale-105 transition duration-300">
              <div className="rounded-full bg-primary-100 w-12 h-12 flex items-center justify-center mb-4">
                <FaChartBar className="text-primary-600 w-6 h-6" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Relevance Ranking</h3>
              <p className="text-gray-600">
                Advanced algorithms ensure the most relevant documents appear first, 
                with smart ranking that considers content, context, and document metadata.
              </p>
            </div>
          </div>
        </div>
        
        {/* How it works section */}
        <div className="py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">How It Works</h2>
            <p className="mt-2 text-xl text-gray-600">Search smarter, not harder</p>
          </div>
          
          <div className="relative">
            {/* Connection line */}
            <div className="hidden md:block absolute top-1/2 left-0 right-0 h-0.5 bg-primary-200 -translate-y-1/2 z-0"></div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
              {/* Step 1 */}
              <div className="bg-white rounded-lg shadow-md p-6 border border-gray-100">
                <div className="rounded-full bg-primary-600 w-12 h-12 flex items-center justify-center mb-4 mx-auto">
                  <span className="text-white font-bold">1</span>
                </div>
                <h3 className="text-center text-lg font-semibold text-gray-900 mb-2">Enter Your Query</h3>
                <p className="text-center text-gray-600">
                  Type what you're looking for in natural language - just like you'd ask a colleague.
                </p>
              </div>
              
              {/* Step 2 */}
              <div className="bg-white rounded-lg shadow-md p-6 border border-gray-100">
                <div className="rounded-full bg-primary-600 w-12 h-12 flex items-center justify-center mb-4 mx-auto">
                  <span className="text-white font-bold">2</span>
                </div>
                <h3 className="text-center text-lg font-semibold text-gray-900 mb-2">AI Processing</h3>
                <p className="text-center text-gray-600">
                  Our AI analyzes your query, understanding intent and context to find the best matches.
                </p>
              </div>
              
              {/* Step 3 */}
              <div className="bg-white rounded-lg shadow-md p-6 border border-gray-100">
                <div className="rounded-full bg-primary-600 w-12 h-12 flex items-center justify-center mb-4 mx-auto">
                  <span className="text-white font-bold">3</span>
                </div>
                <h3 className="text-center text-lg font-semibold text-gray-900 mb-2">Review Results</h3>
                <p className="text-center text-gray-600">
                  Get precisely ranked results with highlighted key sections and instant document previews.
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* CTA section */}
        <div className="py-12 bg-primary-600 rounded-xl shadow-md mb-12">
          <div className="max-w-3xl mx-auto text-center px-6">
            <h2 className="text-3xl font-bold text-white mb-4">Ready to transform how you search documents?</h2>
            <p className="text-xl text-primary-100 mb-8">
              Try a search now and experience the power of AI-enhanced document discovery.
            </p>
            <button 
              onClick={() => document.querySelector('input[type="text"]').focus()}
              className="px-8 py-3 bg-white text-primary-600 font-bold rounded-md hover:bg-primary-50 transition duration-200 shadow-md"
            >
              Start Searching Now
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
