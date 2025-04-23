import React from 'react';
import { FaFilter, FaTimes } from 'react-icons/fa';

/**
 * Component to display and manage metadata filters for search
 * 
 * @param {Object} props
 * @param {Object} props.filters - Current filter values
 * @param {Function} props.onFilterChange - Function to call when a filter changes
 * @param {boolean} props.isExpanded - Whether the filters are expanded
 * @param {Function} props.onToggleExpand - Function to toggle expanded state
 * @param {string} props.className - Additional CSS classes
 * @returns {JSX.Element}
 */
export default function MetadataFilters({ 
  filters, 
  onFilterChange, 
  isExpanded = false, 
  onToggleExpand,
  className = '' 
}) {
  // Handle filter change
  const handleChange = (e) => {
    const { name, value } = e.target;
    onFilterChange(name, value);
  };
  
  // Clear all filters
  const clearFilters = () => {
    onFilterChange('filetype', '');
    onFilterChange('dateFrom', '');
    onFilterChange('dateTo', '');
    onFilterChange('author', '');
  };
  
  // Check if any filters are active
  const hasActiveFilters = 
    filters.filetype || 
    filters.dateFrom || 
    filters.dateTo || 
    filters.author;
  
  return (
    <div className={`bg-white rounded-lg shadow p-4 ${className}`}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-gray-700 flex items-center">
          <FaFilter className="mr-2 text-primary-500" />
          Filters
        </h3>
        
        <div className="flex items-center space-x-2">
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-sm text-gray-500 hover:text-gray-700 flex items-center"
              title="Clear all filters"
            >
              <FaTimes className="mr-1" />
              Clear
            </button>
          )}
          
          {onToggleExpand && (
            <button
              onClick={onToggleExpand}
              className="text-sm text-primary-600 hover:text-primary-800"
            >
              {isExpanded ? 'Hide Filters' : 'Show Filters'}
            </button>
          )}
        </div>
      </div>
      
      {isExpanded && (
        <div className="space-y-4">
          {/* File Type Filter */}
          <div>
            <label htmlFor="filetype" className="block text-sm font-medium text-gray-700 mb-1">
              File Type
            </label>
            <select
              id="filetype"
              name="filetype"
              value={filters.filetype}
              onChange={handleChange}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            >
              <option value="">All Types</option>
              <option value="pdf">PDF</option>
              <option value="doc">Word (DOC/DOCX)</option>
              <option value="ppt">PowerPoint (PPT/PPTX)</option>
              <option value="xls">Excel (XLS/XLSX)</option>
            </select>
          </div>
          
          {/* Date Range Filter */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="dateFrom" className="block text-sm font-medium text-gray-700 mb-1">
                From Date
              </label>
              <input
                type="date"
                id="dateFrom"
                name="dateFrom"
                value={filters.dateFrom}
                onChange={handleChange}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              />
            </div>
            
            <div>
              <label htmlFor="dateTo" className="block text-sm font-medium text-gray-700 mb-1">
                To Date
              </label>
              <input
                type="date"
                id="dateTo"
                name="dateTo"
                value={filters.dateTo}
                onChange={handleChange}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              />
            </div>
          </div>
          
          {/* Author Filter */}
          <div>
            <label htmlFor="author" className="block text-sm font-medium text-gray-700 mb-1">
              Author
            </label>
            <input
              type="text"
              id="author"
              name="author"
              value={filters.author}
              onChange={handleChange}
              placeholder="Filter by author"
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            />
          </div>
        </div>
      )}
      
      {/* Active Filters Summary (when collapsed) */}
      {!isExpanded && hasActiveFilters && (
        <div className="flex flex-wrap gap-2 mt-2">
          {filters.filetype && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
              Type: {filters.filetype.toUpperCase()}
              <button
                onClick={() => onFilterChange('filetype', '')}
                className="ml-1 text-primary-500 hover:text-primary-700"
              >
                <FaTimes size={10} />
              </button>
            </span>
          )}
          
          {filters.dateFrom && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
              From: {new Date(filters.dateFrom).toLocaleDateString()}
              <button
                onClick={() => onFilterChange('dateFrom', '')}
                className="ml-1 text-primary-500 hover:text-primary-700"
              >
                <FaTimes size={10} />
              </button>
            </span>
          )}
          
          {filters.dateTo && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
              To: {new Date(filters.dateTo).toLocaleDateString()}
              <button
                onClick={() => onFilterChange('dateTo', '')}
                className="ml-1 text-primary-500 hover:text-primary-700"
              >
                <FaTimes size={10} />
              </button>
            </span>
          )}
          
          {filters.author && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
              Author: {filters.author}
              <button
                onClick={() => onFilterChange('author', '')}
                className="ml-1 text-primary-500 hover:text-primary-700"
              >
                <FaTimes size={10} />
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
