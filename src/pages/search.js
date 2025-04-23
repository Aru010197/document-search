import { useState } from 'react';
import Head from 'next/head';
import Layout from '../components/layout/Layout';
import SearchForm from '../components/search/SearchForm';
import SearchResults from '../components/search/SearchResults';
import MetadataFilters from '../components/search/MetadataFilters';
import useSearch from '../hooks/useSearch';

export default function SearchPage() {
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  
  const {
    query,
    setQuery,
    filters,
    results,
    pagination,
    isLoading,
    error,
    handleSearch,
    handleFilterChange,
    handlePageChange
  } = useSearch();
  
  return (
    <Layout>
      <Head>
        <title>Search Documents | Document Search App</title>
        <meta name="description" content="Search through your documents with powerful filters and contextual results" />
      </Head>
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-800 mb-6">Search Documents</h1>
          
          {/* Search Form */}
          <div className="mb-6">
            <SearchForm 
              initialQuery={query} 
              onSearch={handleSearch} 
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Filters Sidebar */}
            <div className="md:col-span-1">
              <MetadataFilters 
                filters={filters}
                onFilterChange={handleFilterChange}
                isExpanded={filtersExpanded}
                onToggleExpand={() => setFiltersExpanded(!filtersExpanded)}
              />
            </div>
            
            {/* Search Results */}
            <div className="md:col-span-3">
              <SearchResults 
                results={results}
                isLoading={isLoading}
                error={error}
                query={query}
                pagination={pagination}
                onPageChange={handlePageChange}
              />
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
