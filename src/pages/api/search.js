import { getServerSupabase } from '../../lib/supabase';
import { SIMILARITY_THRESHOLD } from '../../config/embeddings';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get search parameters from query
    const { 
      query, 
      filetype, 
      dateFrom, 
      dateTo, 
      author,
      page = 1, 
      limit = 10 
    } = req.query;

    // Validate search query
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    // Calculate pagination
    const offset = (page - 1) * limit;

    // Hybrid search approach
    const results = await performHybridSearch(
      query, 
      { filetype, dateFrom, dateTo, author }, 
      { limit: parseInt(limit), offset: parseInt(offset) }
    );

    return res.status(200).json({
      results: results.data,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: results.count,
        totalPages: Math.ceil(results.count / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Search error:', error);
    return res.status(500).json({ error: 'Failed to perform search' });
  }
}

/**
 * Perform hybrid search combining vector similarity and full-text search
 */
async function performHybridSearch(query, filters = {}, pagination = { limit: 10, offset: 0 }) {
  // Get server-side Supabase client
  const supabase = getServerSupabase();
  
  // Import the embeddings module
  const { generateEmbedding } = await import('../../lib/embeddings');
  
  // Generate embedding for the search query
  const queryEmbedding = await generateEmbedding(query);
  
  // Use pgvector's match_documents function for semantic search
  const { data: vectorResults, error: vectorError } = await supabase.rpc(
    'match_documents',
    {
      query_embedding: queryEmbedding,
      match_threshold: SIMILARITY_THRESHOLD,
      match_count: 50 // Get more results than needed for filtering
    }
  );
  
  if (vectorError) {
    console.error('Vector search error:', vectorError);
    throw new Error('Vector search failed');
  }
  
  // Get document IDs from vector results
  const documentIds = [...new Set(vectorResults.map(result => result.document_id))];
  
  // If no vector results, fall back to keyword search
  if (documentIds.length === 0) {
    // Build the base query for keyword search
    let dbQuery = supabase
      .from('document_chunks')
      .select(`
        id,
        content,
        chunk_index,
        document_id,
        documents!inner(
          id,
          filename,
          filetype,
          filesize,
          title,
          author,
          upload_date,
          last_modified,
          metadata
        )
      `)
      .ilike('content', `%${query}%`);
  
    // Apply filters
    if (filters.filetype) {
      dbQuery = dbQuery.eq('documents.filetype', filters.filetype);
    }

    if (filters.author) {
      dbQuery = dbQuery.eq('documents.author', filters.author);
    }

    if (filters.dateFrom) {
      dbQuery = dbQuery.gte('documents.upload_date', filters.dateFrom);
    }

    if (filters.dateTo) {
      dbQuery = dbQuery.lte('documents.upload_date', filters.dateTo);
    }
    
    // Get total count
    const { count, error: countError } = await dbQuery.count();
    
    if (countError) {
      console.error('Count error:', countError);
      throw new Error('Failed to count search results');
    }
    
    // Apply pagination
    dbQuery = dbQuery
      .order('documents.upload_date', { ascending: false })
      .range(pagination.offset, pagination.offset + pagination.limit - 1);
    
    // Execute query
    const { data, error } = await dbQuery;
    
    if (error) {
      console.error('Search error:', error);
      throw new Error('Search failed');
    }
    
    // Process results to include snippets with highlighted search terms
    const processedResults = (data || []).map(result => {
      // Create a snippet from the content
      const snippet = createSnippet(result.content, query, 200);

      // Format the result
      return {
        id: result.id,
        document_id: result.document_id,
        title: result.documents.title || result.documents.filename,
        filename: result.documents.filename,
        filetype: result.documents.filetype,
        filesize: result.documents.filesize,
        author: result.documents.author,
        upload_date: result.documents.upload_date,
        last_modified: result.documents.last_modified,
        snippet,
        score: 1.0, // Keyword match score
        metadata: result.documents.metadata
      };
    });

    return {
      data: processedResults,
      count: count
    };
  }
  
  // If we have vector results, fetch the full document data for those results
  let dbQuery = supabase
    .from('document_chunks')
    .select(`
      id,
      content,
      chunk_index,
      document_id,
      documents!inner(
        id,
        filename,
        filetype,
        filesize,
        title,
        author,
        upload_date,
        last_modified,
        metadata
      )
    `)
    .in('document_id', documentIds);
  
  // Apply filters
  if (filters.filetype) {
    dbQuery = dbQuery.eq('documents.filetype', filters.filetype);
  }

  if (filters.author) {
    dbQuery = dbQuery.eq('documents.author', filters.author);
  }

  if (filters.dateFrom) {
    dbQuery = dbQuery.gte('documents.upload_date', filters.dateFrom);
  }

  if (filters.dateTo) {
    dbQuery = dbQuery.lte('documents.upload_date', filters.dateTo);
  }
  
  // Get total count
  const { count, error: countError } = await dbQuery.count();
  
  if (countError) {
    console.error('Count error:', countError);
    throw new Error('Failed to count search results');
  }
  
  // Apply pagination
  dbQuery = dbQuery
    .order('documents.upload_date', { ascending: false })
    .range(pagination.offset, pagination.offset + pagination.limit - 1);
  
  // Execute query
  const { data, error } = await dbQuery;
  
  if (error) {
    console.error('Search error:', error);
    throw new Error('Search failed');
  }
  
  // Process results to include snippets with highlighted search terms
  const processedResults = (data || []).map(result => {
    // Create a snippet from the content
    const snippet = createSnippet(result.content, query, 200);

    // Format the result
    return {
      id: result.id,
      document_id: result.document_id,
      title: result.documents.title || result.documents.filename,
      filename: result.documents.filename,
      filetype: result.documents.filetype,
      filesize: result.documents.filesize,
      author: result.documents.author,
      upload_date: result.documents.upload_date,
      last_modified: result.documents.last_modified,
      snippet,
      score: 1.0, // Mock score for now
      metadata: result.documents.metadata
    };
  });

  return {
    data: processedResults,
    count: count
  };
}

/**
 * Create a snippet from content with highlighted search terms
 */
function createSnippet(content, query, maxLength = 200) {
  if (!content) return '';
  
  // Normalize content and query
  const normalizedContent = content.toLowerCase();
  const normalizedQuery = query.toLowerCase();
  const queryTerms = normalizedQuery.split(/\s+/).filter(term => term.length > 2);
  
  // Find the best position for the snippet
  let bestPosition = 0;
  let highestTermCount = 0;
  
  // Check term frequency in different windows
  const windowSize = 100;
  for (let i = 0; i < normalizedContent.length - windowSize; i += 20) {
    const window = normalizedContent.substring(i, i + windowSize);
    let termCount = 0;
    
    for (const term of queryTerms) {
      if (window.includes(term)) {
        termCount++;
      }
    }
    
    if (termCount > highestTermCount) {
      highestTermCount = termCount;
      bestPosition = i;
    }
  }
  
  // If no terms found, just take the beginning
  if (highestTermCount === 0) {
    bestPosition = 0;
  }
  
  // Extract snippet
  let startPos = Math.max(0, bestPosition - 20);
  let endPos = Math.min(content.length, startPos + maxLength);
  
  // Adjust to not cut words
  while (startPos > 0 && content[startPos] !== ' ' && content[startPos] !== '.') {
    startPos--;
  }
  
  while (endPos < content.length && content[endPos] !== ' ' && content[endPos] !== '.') {
    endPos++;
  }
  
  // Add ellipsis if needed
  const prefix = startPos > 0 ? '...' : '';
  const suffix = endPos < content.length ? '...' : '';
  
  // Extract the snippet
  const snippet = prefix + content.substring(startPos, endPos).trim() + suffix;
  
  return snippet;
}
