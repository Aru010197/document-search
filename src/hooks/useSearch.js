import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/router';

export default function useSearch() {
  const router = useRouter();
  const { query: routerQuery } = router;
  
  // Search state
  const [query, setQuery] = useState('');
  const [useReranker, setUseReranker] = useState(true); // Always use reranker by default
  const [filters, setFilters] = useState({
    filetype: '',
    dateFrom: '',
    dateTo: '',
    author: ''
  });
  const [results, setResults] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Initialize search state from URL query parameters
  useEffect(() => {
    if (Object.keys(routerQuery).length > 0) {
      // Set search query
      if (routerQuery.query) {
        setQuery(routerQuery.query);
      }
      
      // Set reranker option
      if (routerQuery.rerank) {
        setUseReranker(routerQuery.rerank === 'true');
      }
      
      // Set filters
      const newFilters = { ...filters };
      if (routerQuery.filetype) newFilters.filetype = routerQuery.filetype;
      if (routerQuery.dateFrom) newFilters.dateFrom = routerQuery.dateFrom;
      if (routerQuery.dateTo) newFilters.dateTo = routerQuery.dateTo;
      if (routerQuery.author) newFilters.author = routerQuery.author;
      setFilters(newFilters);
      
      // Set pagination
      if (routerQuery.page) {
        setPagination(prev => ({
          ...prev,
          page: parseInt(routerQuery.page)
        }));
      }
      
      // Perform search if query exists
      if (routerQuery.query) {
        performSearch(
          routerQuery.query,
          {
            filetype: routerQuery.filetype || '',
            dateFrom: routerQuery.dateFrom || '',
            dateTo: routerQuery.dateTo || '',
            author: routerQuery.author || ''
          },
          parseInt(routerQuery.page || '1'),
          routerQuery.rerank === 'true'
        );
      }
    }
  }, [routerQuery]);

  // Perform search
  const performSearch = useCallback(async (searchQuery, searchFilters = filters, page = 1, rerank = true) => {
    if (!searchQuery || searchQuery.trim() === '') {
      setResults([]);
      setPagination(prev => ({
        ...prev,
        total: 0,
        totalPages: 0
      }));
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Build query parameters
      const params = new URLSearchParams();
      params.append('query', searchQuery);
      params.append('page', page.toString());
      params.append('limit', pagination.limit.toString());
      params.append('useReranker', rerank.toString());
      
      if (searchFilters.filetype) params.append('filetype', searchFilters.filetype);
      if (searchFilters.dateFrom) params.append('dateFrom', searchFilters.dateFrom);
      if (searchFilters.dateTo) params.append('dateTo', searchFilters.dateTo);
      if (searchFilters.author) params.append('author', searchFilters.author);
      
      // Make API request
      const response = await fetch(`/api/search?${params.toString()}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Search failed: ${errorData.error || response.statusText}`);
      }
      
      const data = await response.json();
      
      // Results from API are already sorted and paginated.
      // The 'score' field from the API should be the final relevance score.
      setResults(data.results || []);
      
      // Update pagination with data from the API response
      setPagination({
        page: data.pagination?.page || 1,
        limit: data.pagination?.limit || 10,
        total: data.pagination?.total || 0,       // Use total from API
        totalPages: data.pagination?.totalPages || 0 // Use totalPages from API
      });
    } catch (err) {
      console.error('Search error:', err);
      setError(err.message || 'Failed to perform search');
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [filters, pagination.limit, useReranker]);

  // Handle search submission
  const handleSearch = useCallback((searchQuery, rerank = true, searchFilters = filters) => {
    // Update URL with search parameters
    const params = new URLSearchParams();
    params.append('query', searchQuery);
    params.append('rerank', 'true'); // Always use reranker
    
    if (searchFilters.filetype) params.append('filetype', searchFilters.filetype);
    if (searchFilters.dateFrom) params.append('dateFrom', searchFilters.dateFrom);
    if (searchFilters.dateTo) params.append('dateTo', searchFilters.dateTo);
    if (searchFilters.author) params.append('author', searchFilters.author);
    
    // Navigate to search page with query parameters
    router.push(`/search?${params.toString()}`);
  }, [router, filters, useReranker]);

  // Handle filter changes
  const handleFilterChange = useCallback((name, value) => {
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  }, []);

  // Handle page change
  const handlePageChange = useCallback((newPage) => {
    // Update URL with new page
    const params = new URLSearchParams(window.location.search);
    params.set('page', newPage.toString());
    
    // Navigate to new page
    router.push(`/search?${params.toString()}`);
  }, [router]);

  // Handle reranker toggle - now always sets to true
  const handleRerankerToggle = useCallback((value) => {
    setUseReranker(true);
    
    // If we have an active search, ensure reranker is enabled
    if (query) {
      // Update URL with reranker always enabled
      const params = new URLSearchParams(window.location.search);
      params.set('rerank', 'true');
      
      // Navigate to updated search
      router.push(`/search?${params.toString()}`);
    }
  }, [query, router]);

  return {
    query,
    setQuery,
    useReranker,
    setUseReranker,
    filters,
    results,
    pagination,
    isLoading,
    error,
    handleSearch,
    handleFilterChange,
    handlePageChange,
    handleRerankerToggle
  };
}
