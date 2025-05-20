import React, { useState, useEffect } from 'react';
import { FaSearch, FaTimes, FaRobot } from 'react-icons/fa';

/**
 * Component for the search input form
 * 
 * @param {Object} props
 * @param {string} props.initialQuery - Initial search query
 * @param {boolean} props.useReranker - Whether to use the reranker
 * @param {Function} props.onSearch - Function to call when search is submitted
 * @param {Function} props.onRerankerToggle - Function to call when reranker is toggled
 * @param {string} props.className - Additional CSS classes
 * @returns {JSX.Element}
 */
export default function SearchForm({ 
  initialQuery = '', 
  useReranker = false, 
  onSearch, 
  onRerankerToggle,
  className = '' 
}) {
  const [query, setQuery] = useState(initialQuery);
  const [reranker, setReranker] = useState(useReranker);
  
  // Update local state when props change
  useEffect(() => {
    setQuery(initialQuery);
    setReranker(useReranker);
  }, [initialQuery, useReranker]);
  
  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim(), reranker);
    }
  };
  
  // Handle reranker toggle
  const handleRerankerToggle = () => {
    const newValue = !reranker;
    setReranker(newValue);
    if (onRerankerToggle) {
      onRerankerToggle(newValue);
    }
  };
  
  // Clear search query
  const clearQuery = () => {
    setQuery('');
    // Optional: trigger search with empty query
    // onSearch('');
  };
  
  return (
    <form onSubmit={handleSubmit} className={`${className}`}>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <FaSearch className="h-5 w-5 text-gray-400" />
        </div>
        
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
          placeholder="Search documents..."
          aria-label="Search documents"
        />
        
        {query && (
          <div className="absolute inset-y-0 right-10 flex items-center">
            <button
              type="button"
              onClick={clearQuery}
              className="p-1 text-gray-400 hover:text-gray-500 focus:outline-none"
              aria-label="Clear search"
            >
              <FaTimes className="h-4 w-4" />
            </button>
          </div>
        )}
        
        <div className="absolute inset-y-0 right-0 flex items-center">
          <button
            type="submit"
            className="p-2 text-primary-600 hover:text-primary-800 focus:outline-none"
            aria-label="Submit search"
          >
            Search
          </button>
        </div>
      </div>
      
      <div className="mt-2 flex justify-between items-center">
        <p className="text-xs text-gray-500">
          Search for documents by keywords, phrases, or metadata. Use quotes for exact phrases.
        </p>
        
        <div className="flex items-center">
          <span className="text-sm text-primary-600 flex items-center">
            <FaRobot className="mr-1 text-primary-500" />
            <span>AI-Enhanced Search</span>
          </span>
        </div>
      </div>
    </form>
  );
}
