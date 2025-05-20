import { getServerSupabase } from '../../lib/supabase';
import { EMBEDDING_PROVIDERS } from '../../config/embeddings';
import { generateEmbedding } from '../../lib/embeddings';
import { rerankResults } from '../../lib/embeddings/cross-encoder';
import { 
  enhanceQueryForSemanticSearch
} from '../../lib/search/query-processor';
import { createHighlightedSnippet, createSnippet } from './search-utils';

/**
 * Calculate a dynamic similarity threshold based on query characteristics
 * 
 * @param {string} query - The search query
 * @returns {number} - The calculated similarity threshold
 */
function getDynamicThreshold(query) {
  // For very short queries, use a much lower threshold
  if (query.length < 10) return 0.15; // Drastically lowered from 0.25
  
  // For very specific queries (contains quotes, special terms, or many words)
  if (
    query.includes('"') || 
    query.includes("'") || 
    query.includes(':') || 
    query.split(/\s+/).length > 4
  ) {
    return 0.25; // Drastically lowered from 0.5
  }
  
  // For queries that look like questions or contain action words like "give me"
  if (
    query.includes('?') || 
    /^(what|who|when|where|why|how|show|give|find|get)/i.test(query)
  ) {
    return 0.2; // Drastically lowered from 0.35
  }
  
  // Default threshold
  return 0.2; // Drastically lowered from 0.3
}

// Helper function to calculate filename similarity bonus
function calculateFilenameBonus(queryKeyTerms, filename) {
  console.log(`[calculateFilenameBonus] Input filename: "${filename}", queryKeyTerms:`, queryKeyTerms);
  if (!filename || !queryKeyTerms || queryKeyTerms.length === 0) {
    console.log('[calculateFilenameBonus] Returning 0.0 (invalid input or no key terms)');
    return 0.0;
  }

  // Normalize filename: lowercase and remove common document extensions
  const normalizedFilename = filename.toLowerCase().replace(/\.(pdf|docx?|pptx?|xlsx?|txt)$/, '');
  console.log(`[calculateFilenameBonus] Normalized filename for "${filename}": "${normalizedFilename}"`);

  let matches = 0;
  for (const term of queryKeyTerms) {
    const termIncluded = normalizedFilename.includes(term);
    console.log(`[calculateFilenameBonus] Checking term "${term}" in "${normalizedFilename}": ${termIncluded}`);
    if (termIncluded) {
      matches++;
    }
  }
  console.log(`[calculateFilenameBonus] Total matches for "${filename}": ${matches} out of ${queryKeyTerms.length} terms.`);

  if (matches === 0) {
    console.log(`[calculateFilenameBonus] Returning 0.0 for "${filename}" (no matches)`);
    return 0.0;
  }
  // Significantly increased bonus values
  if (matches === queryKeyTerms.length) {
    console.log(`[calculateFilenameBonus] Returning 0.7 for "${filename}" (all terms match)`);
    return 0.7; // Increased from 0.2
  }
  if (queryKeyTerms.length > 0 && (matches / queryKeyTerms.length) > 0.5) {
    console.log(`[calculateFilenameBonus] Returning 0.35 for "${filename}" (more than half terms match)`);
    return 0.35; // Increased from 0.1
  }
  console.log(`[calculateFilenameBonus] Returning 0.15 for "${filename}" (at least one term match)`);
  return 0.15; // Increased from 0.05
}

/**
 * Calculate document relevance score with multiple factors
 * 
 * @param {Object} document - Document data with semantic similarity score
 * @param {string} query - User's search query
 * @param {Array} queryKeyTerms - Important terms extracted from the query
 * @returns {Object} - Document with updated score and score components
 */
function calculateRelevanceScore(document, query, queryKeyTerms) {
  // Start with base semantic similarity (0-1 range)
  const semanticScore = document.similarity || document.score || 0;
  
  // Extract additional scoring signals
  const contentRelevance = calculateContentRelevance(document.content, query, queryKeyTerms);
  const filenameScore = calculateFilenameScore(document.title || document.filename || '', queryKeyTerms);
  const recencyScore = calculateRecencyScore(document.metadata?.created_at || document.created_at);
  
  // Weight the different components (adjust weights based on importance)
  const weights = {
    semantic: 0.65,    // Base vector similarity is most important
    content: 0.15,     // Actual content relevance (keyword matches)
    filename: 0.15,    // Filename/title relevance
    recency: 0.05      // Newer documents get small boost
  };
  
  // Calculate weighted score (capped at 1.0)
  const weightedScore = Math.min(1.0, (
    semanticScore * weights.semantic +
    contentRelevance * weights.content +
    filenameScore * weights.filename +
    recencyScore * weights.recency
  ));
  
  // Store all the score components for debugging/transparency
  return {
    ...document,
    originalScore: semanticScore,
    contentScore: contentRelevance,
    filenameScore: filenameScore,
    recencyScore: recencyScore,
    score: weightedScore, // Replace with the new weighted score
    scoreComponents: { semanticScore, contentRelevance, filenameScore, recencyScore, weights }
  };
}

/**
 * Calculate content relevance score based on keyword matches
 * 
 * @param {string} content - Document content
 * @param {string} query - Search query
 * @param {Array} keyTerms - Important terms from query
 * @returns {number} - Content relevance score (0-1)
 */
function calculateContentRelevance(content, query, keyTerms) {
  if (!content || typeof content !== 'string' || content.trim() === '') {
    return 0;
  }
  
  // Normalize content
  const normalizedContent = content.toLowerCase();
  
  // Calculate exact phrase match (highest importance)
  const exactPhraseScore = query && normalizedContent.includes(query.toLowerCase()) ? 0.8 : 0;
  
  // Calculate keyword coverage
  let keywordMatches = 0;
  
  if (keyTerms && keyTerms.length > 0) {
    keyTerms.forEach(term => {
      if (normalizedContent.includes(term.toLowerCase())) {
        keywordMatches++;
      }
    });
  }
  
  const keywordCoverageScore = keyTerms && keyTerms.length > 0 ? 
    (keywordMatches / keyTerms.length) : 0;
    
  // Calculate density of matches
  const contentLength = content.length;
  const keywordsLength = keyTerms ? keyTerms.join(' ').length : 0;
  const densityScore = contentLength > 0 ? 
    Math.min(1.0, (keywordsLength * keywordMatches) / contentLength * 20) : 0;
    
  // Combine the different content relevance signals
  return Math.max(
    exactPhraseScore,
    keywordCoverageScore * 0.7,
    densityScore * 0.5
  );
}

/**
 * Calculate filename/title relevance score
 * 
 * @param {string} filename - Document filename or title
 * @param {Array} queryKeyTerms - Important terms from query
 * @returns {number} - Filename relevance score (0-1)
 */
function calculateFilenameScore(filename, queryKeyTerms) {
  if (!filename || typeof filename !== 'string' || !queryKeyTerms || queryKeyTerms.length === 0) {
    return 0.0;
  }

  // Normalize filename: lowercase and remove common document extensions
  const normalizedFilename = filename.toLowerCase().replace(/\.(pdf|docx?|pptx?|xlsx?|txt)$/, '');
  
  let matches = 0;
  for (const term of queryKeyTerms) {
    if (normalizedFilename.includes(term.toLowerCase())) {
      matches++;
    }
  }

  if (matches === 0) {
    return 0.0;
  }
  
  // Complete match: all terms found in filename - return 100% score
  if (matches === queryKeyTerms.length) {
    return 1.0;  // 100% match - highest possible score
  }
  
  // Partial matches
  return matches / queryKeyTerms.length * 0.8;
}

/**
 * Calculate recency score based on document creation time
 * 
 * @param {string|Date} createdAt - Document creation timestamp
 * @returns {number} - Recency score (0-1)
 */
function calculateRecencyScore(createdAt) {
  if (!createdAt) return 0.5; // Neutral score if no date
  
  const docDate = new Date(createdAt);
  if (isNaN(docDate.getTime())) return 0.5; // Invalid date
  
  const now = new Date();
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(now.getFullYear() - 1);
  
  // Documents less than a year old get higher scores
  if (docDate > oneYearAgo) {
    // Linear score from 0.6 to 1.0 based on how recent (within the year)
    const ageInMs = now - docDate;
    const yearInMs = now - oneYearAgo;
    return 0.6 + 0.4 * (1 - (ageInMs / yearInMs));
  }
  
  // Older documents get lower but still meaningful scores
  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(now.getFullYear() - 2);
  
  if (docDate > twoYearsAgo) {
    return 0.4; // 1-2 years old
  }
  
  return 0.3; // More than 2 years old
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Search API called with query:', req.query);
    
    // Validate Supabase configuration
    const supabase = getServerSupabase();
    if (!supabase) {
      console.error('Supabase configuration error');
      return res.status(500).json({ 
        error: 'Supabase configuration error. Please check your environment variables.' 
      });
    }
    
    console.log('Supabase client initialized successfully');

    // Get search parameters from query
    const { 
      query, 
      file_type,
      author,
      useReranker = 'true' // Default to using reranker
    } = req.query;

    // Hard-code limit to 5 regardless of what's passed in
    const currentPage = 1; // Always return first page
    const displayLimit = 5; // Always limit to 5 results

    // Validate search query
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      console.log('Invalid search query');
      return res.status(400).json({ error: 'Search query is required' });
    }

    // No pagination - always get first 5 results
    const offset = 0;
    console.log('Pagination:', { page: currentPage, limit: displayLimit, offset });

    // Calculate dynamic similarity threshold based on query characteristics
    const dynamicThreshold = getDynamicThreshold(query);
    console.log('Using dynamic similarity threshold:', dynamicThreshold);
    
    // Enhance the query for semantic search
    const enhancedQuery = enhanceQueryForSemanticSearch(query);
    console.log('Enhanced query for semantic search:', enhancedQuery);
    
    // Try semantic search first
    console.log('Performing semantic search...');
    const semanticResults = await performSemanticSearch(
      supabase,
      enhancedQuery.enhancedQuery || query, // Use the enhanced query
      { filetype: file_type }, 
      { limit: displayLimit, offset: offset, threshold: dynamicThreshold } 
    );
    
    // If semantic search returns results, use them
    if (semanticResults.data && semanticResults.data.length > 0) {
      console.log(`Semantic search found ${semanticResults.data.length} results`);
      
      // Extract key terms from the query for relevance scoring
      const queryKeyTerms = enhancedQuery.keyTerms || 
        query.toLowerCase().match(/\b[a-zA-Z0-9]{3,}\b/g) || [];
      
      console.log('Key terms for relevance scoring:', queryKeyTerms);
      
      // Apply our comprehensive relevance scoring
      let processedResults = semanticResults.data.map(doc => 
        calculateRelevanceScore(doc, query, queryKeyTerms)
      );
      
      // Apply reranking if requested and there are multiple results
      if (useReranker === 'true' && processedResults.length > 1) {
        try {
          console.log('Applying reranking to search results...');
          
          // Get the query terms for filename matching
          const queryKeyTerms = enhancedQuery.keyTerms || 
            query.toLowerCase().match(/\b[a-zA-Z0-9]{3,}\b/g) || [];
          
          // First, mark any documents that have exact filename matches before reranking
          processedResults = processedResults.map(doc => {
            const filename = doc.title || doc.filename || '';
            const normalizedFilename = filename.toLowerCase();
            
            // Check if all search terms are in the filename
            const allTermsInFilename = queryKeyTerms.length > 0 && 
              queryKeyTerms.every(term => normalizedFilename.includes(term.toLowerCase()));
            
            // Log filename matches for debugging
            if (allTermsInFilename) {
              console.log(`PRE-RERANKER: Filename match found: "${filename}" contains all terms: ${queryKeyTerms.join(', ')}`);
            }
            
            return {
              ...doc,
              exactFilenameMatch: allTermsInFilename,
              originalScore: doc.score
            };
          });
          
          // Apply reranking
          const rerankedResults = await rerankResults(query, processedResults, {
            textField: 'content',
            scoreField: 'rerankerScore'
          });
          
          if (rerankedResults && rerankedResults.length > 0) {
            // Process reranked results
            processedResults = rerankedResults.map(doc => {
              // Get filename again for clarity in this block
              const filename = doc.title || doc.filename || '';
              const normalizedFilename = filename.toLowerCase();
              
              // Check again if all search terms are in the filename (for clarity)
              const allTermsInFilename = doc.exactFilenameMatch === true || (queryKeyTerms.length > 0 && 
                queryKeyTerms.every(term => normalizedFilename.includes(term.toLowerCase())));
              
              // Ensure scoreComponents exists
              const safeComponents = doc.scoreComponents || {};
              
              // Create a clean object with proper number values
              const components = {
                semantic: typeof safeComponents.semanticScore === 'number' ? safeComponents.semanticScore : 0,
                content: typeof safeComponents.contentRelevance === 'number' ? safeComponents.contentRelevance : 0,
                filename: allTermsInFilename ? 1.0 : (typeof safeComponents.filenameScore === 'number' ? safeComponents.filenameScore : 0),
                recency: typeof safeComponents.recencyScore === 'number' ? safeComponents.recencyScore : 0,
                reranker: typeof doc.rerankerScore === 'number' ? doc.rerankerScore : 0
              };
              
              // For filename matches, use a perfect score
              if (allTermsInFilename) {
                console.log(`POST-RERANKER: Setting "${filename}" score to 1.0 (perfect match) - original: ${doc.originalScore?.toFixed(4)}, reranker: ${doc.rerankerScore?.toFixed(4)}`);
                
                return {
                  ...doc,
                  score: 1.0,
                  filenameScore: 1.0,
                  scoreComponents: components,
                  exactFilenameMatch: true,
                  exactMatchPriority: 999
                };
              }
              
              // For non-filename matches, combine scores but cap at 0.99
              const relevanceScore = typeof doc.originalScore === 'number' ? doc.originalScore : 0;
              const rerankerScore = typeof doc.rerankerScore === 'number' ? doc.rerankerScore : 0;
              
              // Balanced blend (60% relevance, 40% reranker)
              let blendedScore = (relevanceScore * 0.6) + (rerankerScore * 0.4);
              
              // Hard cap at 0.99 for non-filename matches
              if (blendedScore > 0.99) {
                blendedScore = 0.99;
                console.log(`Capping score for "${filename}" to 0.99 (not a filename match)`);
              }
              
              return {
                ...doc,
                score: blendedScore,
                scoreComponents: components,
                exactFilenameMatch: false,
                exactMatchPriority: 0
              };
            });
            
            console.log('Reranking completed and scores blended with filename priority logic');
          }
        } catch (rerankerError) {
          console.error('Reranking error:', rerankerError);
          // Continue with original relevance scores
        }
      }
      
      // One final check to ensure any documents that might have been missed get proper treatment
      processedResults = processedResults.map(doc => {
        // Skip if already explicitly processed as a filename match
        if (doc.exactFilenameMatch === true) {
          return doc;
        }
        
        const filename = doc.title || doc.filename || '';
        const normalizedFilename = filename.toLowerCase();
        
        // Extract query terms from the enhanced query
        const queryKeyTerms = enhancedQuery.keyTerms || 
          query.toLowerCase().match(/\b[a-zA-Z0-9]{3,}\b/g) || [];
        
        // Check if all search terms are in the filename
        const allTermsInFilename = queryKeyTerms.length > 0 && 
          queryKeyTerms.every(term => normalizedFilename.includes(term.toLowerCase()));
        
        if (allTermsInFilename) {
          console.log(`FINAL-CHECK: Found missed filename match: "${filename}" - setting score to 1.0 (100%)`);
          return {
            ...doc,
            score: 1.0, // Set score to 100%
            filenameScore: 1.0,
            exactFilenameMatch: true,
            exactMatchPriority: 999
          };
        }
        
        // If not a filename match, ensure score is capped
        if (doc.score >= 0.99) {
          return {
            ...doc,
            score: 0.99, // Cap at 99% for non-filename matches
          };
        }
        
        return doc;
      });
      
      // Final sort - prioritize exact filename matches first, then by score
      processedResults.sort((a, b) => {
        // First check if either is a filename match
        if ((a.exactFilenameMatch === true) && !(b.exactFilenameMatch === true)) return -1;
        if (!(a.exactFilenameMatch === true) && (b.exactFilenameMatch === true)) return 1;
        // If both or neither are filename matches, sort by score
        return b.score - a.score;
      });
      
      // Debug logging for top results
      console.log('Top results after relevance scoring:',
        processedResults.slice(0, 5).map(r => ({
          title: r.title || 'Unknown',
          score: typeof r.score === 'number' ? r.score.toFixed(4) : r.score,
          exactMatch: r.exactFilenameMatch === true ? 'YES' : 'NO',
          query: query,
          terms: enhancedQuery.keyTerms || [],
          components: Object.entries(r.scoreComponents || {})
            .map(([k, v]) => {
              const formattedValue = typeof v === 'number' ? v.toFixed(2) : String(v);
              return `${k}:${formattedValue}`;
            })
            .join(', ')
        }))
      );
      
      // Take only top 5 results - hard limit
      const limitedResults = processedResults.slice(0, 5);
      
      return res.status(200).json({
        results: limitedResults,
        pagination: {
          page: 1, // Always page 1
          limit: 5, // Always limit 5
          total: Math.min(5, semanticResults.count), // Cap total at 5
          totalPages: 1 // Always 1 page
        }
      });
    }
    
    // If semantic search returns no results, return empty
    console.log('No semantic search results. Returning empty results.');
    return res.status(200).json({
      results: [],
      pagination: {
        page: 1,
        limit: 5,
        total: 0,
        totalPages: 0
      }
    });

  } catch (error) {
    console.error('Search error:', error);
    return res.status(500).json({ 
      error: `Failed to perform search: ${error.message}` 
    });
  }
}

/**
 * Perform semantic search using embeddings
 */
async function performSemanticSearch(supabase, query, filters = {}, pagination = { limit: 10, offset: 0 }) {
  try {
    console.log('performSemanticSearch called with query:', query);
    console.log('Filters:', filters);
    console.log('Pagination:', pagination);
    
    // Generate embedding for the query
    console.log('Generating embedding for query...');
    let queryEmbedding;
    try {
      queryEmbedding = await generateEmbedding(query, EMBEDDING_PROVIDERS.SBERT);
      console.log('Query embedding generated successfully.');

      // Add this line to log the vector for EXPLAIN ANALYZE
      console.log("VECTOR FOR EXPLAIN ANALYZE:", JSON.stringify(queryEmbedding));

    } catch (embeddingError) {
      console.error('Error generating query embedding:', embeddingError);
      // Return empty results if embedding generation fails
      return {
        data: [],
        count: 0
      };
    }
    
    // Use the dynamic threshold from pagination options or fall back to default (0.5)
    const threshold = pagination.threshold || 0.5;
    
    // Extract main keywords from query for potential text-based fallback
    const keywordsForTextSearch = query.toLowerCase()
      .match(/\b[a-zA-Z0-9]{3,}\b/g) || [];
    console.log('Keywords for potential text search fallback:', keywordsForTextSearch);
    
    // Track if we've had to use fallbacks
    let usedFallback = false;
    let currentThreshold = threshold;
    
    // Try to use the match_documents function
    try {
      console.log('Using match_document_chunks RPC function...');
      
      // Set a timeout for the RPC call (10 seconds - reduced from 15)
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('RPC call timed out after 10s')), 10000)
      );
      
      // Create the RPC call promise
      const rpcPromise = supabase.rpc('match_document_chunks', {
        query_embedding: queryEmbedding,
        match_threshold: currentThreshold,
        match_count: 20, // Reduced from 50
        p_file_type_filter: filters.filetype || null // Add the p_file_type_filter parameter
      });
      
      // Race between the timeout and the RPC call
      let { data, error } = await Promise.race([rpcPromise, timeoutPromise])
        .catch(err => {
          console.error('RPC call failed or timed out:', err.message);
          return { error: { message: err.message, code: 'TIMEOUT' } };
        });
      
      // If we hit a timeout or other error, try multiple fallback strategies
      if (error) {
        console.error('Error using match_document_chunks RPC:', error);
        usedFallback = true;
        
        // FALLBACK STRATEGY 1: Try with a much lower threshold and lower match count
        if (error.code === 'TIMEOUT' || error.code === '57014' || 
            (error.message && error.message.includes('timeout'))) {
          console.log('Search timed out, using fallback #1: Lower threshold and match count');
          
          // Use a very low threshold for the first fallback
          currentThreshold = 0.05;
          
          try {
            // Simpler query with a much lower threshold and smaller match count
            const fallbackResult = await supabase.rpc('match_document_chunks', {
              query_embedding: queryEmbedding,
              match_threshold: currentThreshold,
              match_count: 5, // Significantly reduced match count
              p_file_type_filter: null // Don't filter by file type for fallback
            });
            
            if (fallbackResult.error) {
              console.error('Fallback #1 search also failed:', fallbackResult.error);
              error = fallbackResult.error; // Update error for next fallback
            } else if (fallbackResult.data && fallbackResult.data.length > 0) {
              console.log(`Fallback #1 search successful: ${fallbackResult.data.length} results`);
              data = fallbackResult.data;
              error = null; // Clear error since we got results
            } else {
              console.log('No results from fallback #1 search');
            }
          } catch (fallbackError) {
            console.error('Error in fallback #1 search:', fallbackError);
            error = fallbackError; // Update error for next fallback
          }
        }
        
        // FALLBACK STRATEGY 2: Try direct SQL query with text search
        if (error && keywordsForTextSearch.length > 0) {
          console.log('Trying fallback #2: Direct SQL query with text search');
          
          try {
            // Construct a basic text search query for keywords in content or filename
            const textSearchTerm = keywordsForTextSearch.join(' | ');
            console.log(`Using text search term: "${textSearchTerm}"`);
            
            const { data: textResults, error: textError } = await supabase
              .from('document_chunk_embeddings') // Use the correct table name from the database schema
              .select(`
                id,
                document_id,
                chunk_index,
                chunk_text as content, // Match field name from document_chunk_embeddings
                embedding
              `)
              .textSearch('chunk_text', textSearchTerm, { // Use the correct column name
                config: 'english'
              })
              .limit(10);
            
            if (textError) {
              console.error('Fallback #2 text search failed:', textError);
            } else if (textResults && textResults.length > 0) {
              console.log(`Fallback #2 text search successful: ${textResults.length} results`);
              
              // Add a basic similarity score for these results
              data = textResults.map(item => ({
                ...item,
                similarity: 0.3, // Assign moderate similarity score to text search results
                document_id: item.document_id,
                chunk_index: item.chunk_index || 0
                // content field is already mapped from chunk_text above
              }));
              
              error = null; // Clear error since we got results
            } else {
              console.log('No results from fallback #2 search');
            }
          } catch (textSearchError) {
            console.error('Error in fallback #2 text search:', textSearchError);
          }
        }
        
        // FALLBACK STRATEGY 3: Last resort - try to get recent documents
        if (!data || data.length === 0) {
          console.log('Trying fallback #3: Get recent documents');
          
          try {
            // Get the most recent documents as a last resort
            const { data: recentDocs, error: recentError } = await supabase
              .from('documents')
              .select(`
                id,
                filename, 
                file_type,
                created_at
              `)
              .order('created_at', { ascending: false })
              .limit(5);
            
            if (recentError) {
              console.error('Fallback #3 recent docs query failed:', recentError);
            } else if (recentDocs && recentDocs.length > 0) {
              console.log(`Fallback #3 recent docs successful: ${recentDocs.length} results`);
              
              // We need to get chunks for these docs to maintain format consistency
              const docIds = recentDocs.map(doc => doc.id);
              
              const { data: docChunks, error: chunksError } = await supabase
                .from('document_chunk_embeddings')  // Use correct table name
                .select('*')
                .in('document_id', docIds)
                .eq('chunk_index', 0) // Just get the first chunk of each doc
                .limit(5);
              
              if (chunksError) {
                console.error('Error fetching chunks for recent docs:', chunksError);
              } else if (docChunks && docChunks.length > 0) {
                // Format to match our expected output
                data = docChunks.map(chunk => ({
                  ...chunk,
                  // Ensure we map the field names correctly
                  content: chunk.chunk_text,
                  similarity: 0.1, // Low similarity score for these results
                }));
                
                console.log('Fallback #3 processed results:', data.length);
                error = null;
              }
            } else {
              console.log('No results from fallback #3');
            }
          } catch (recentDocsError) {
            console.error('Error in fallback #3 recent docs:', recentDocsError);
          }
        }
      }
      
      // Check if we have data after all the fallback attempts
      if (!data || data.length === 0) {
        console.log('All search attempts failed or returned no results');
        return { data: [], count: 0 };
      }
      
      // Log if we used a fallback method
      if (usedFallback) {
        console.log(`Used fallback search strategy with threshold ${currentThreshold}. Results found: ${data.length}`);
      }
      
      // Log the raw data from RPC or fallback
      console.log(`Raw data from ${usedFallback ? 'fallback' : 'RPC'}:`, JSON.stringify(data.slice(0, 2), null, 2) + (data.length > 2 ? '... (truncated)' : ''));

      if (data && data.length > 0) {
        console.log(`Search returned ${data.length} results`);
        
        // Process the match results
        const resultsByDocId = {};
        
        for (const match of data) {
          const docId = match.document_id;
          
          // Check if match contains direct doc_* fields from the updated RPC function
          const hasDirectDocFields = match.doc_filename !== undefined;
          
          // If we haven't seen this document yet, or if this chunk has a higher similarity
          if (!resultsByDocId[docId] || resultsByDocId[docId].score < match.similarity) {
            // Create a snippet from the content with highlighted search terms
            const snippet = createHighlightedSnippet(match.content || match.chunk_text || '', query, 200);
            
            resultsByDocId[docId] = {
              id: match.id,
              document_id: docId,
              title: hasDirectDocFields ? match.doc_filename : 'Untitled Document',
              filename: hasDirectDocFields ? match.doc_filename : 'unknown.file',
              filetype: hasDirectDocFields ? match.doc_file_type : 'unknown',
              filesize: hasDirectDocFields ? match.doc_file_size : 0,
              snippet,
              score: match.similarity,
              metadata: hasDirectDocFields ? match.doc_metadata : {},
              chunk_index: match.chunk_index,
              content: match.content || match.chunk_text
            };
          }
        }
        
        // Only fetch documents if we don't have direct doc fields from RPC
        const firstResult = data[0];
        const needsDocumentFetch = firstResult.doc_filename === undefined;
        
        if (needsDocumentFetch) {
          console.log('Need to fetch document details separately (using old RPC response format)');
          // Get the document IDs from the match results
          const documentIds = [...new Set(data.map(item => item.document_id))];
          
          // Fetch the full document data for these IDs
          const { data: documents, error: docsError } = await supabase
            .from('documents')
            .select(`
              id,
              filename,
              file_type,
              file_size,
              metadata
            `)
            .in('id', documentIds);
          
          if (docsError) {
            console.error('Error fetching documents:', docsError);
            return { data: [], count: 0 };
          }
          
          // Create a map of document_id to document data
          const documentMap = {};
          documents.forEach(doc => {
            documentMap[doc.id] = doc;
          });
          
          // Update results with document data
          Object.values(resultsByDocId).forEach(result => {
            const document = documentMap[result.document_id];
            if (document) {
              result.title = document.title || document.filename || 'Untitled Document';
              result.filename = document.filename || 'unknown.file';
              result.filetype = document.file_type || 'unknown';
              result.filesize = document.file_size;
              result.metadata = document.metadata;
            }
          });
        } else {
          console.log('Using direct document fields from updated RPC response format');
        }
        
        // Convert to array and sort by similarity
        const results = Object.values(resultsByDocId);
        results.sort((a, b) => b.score - a.score);
        
        // Log the scores 
        console.log('Search results: Top processed scores:', results.slice(0, 3).map(r => ({id: r.id, score: r.score, title: r.title })));

        // If we used a fallback strategy, don't filter by threshold since we already used a very low one
        const filteredResults = usedFallback 
          ? results 
          : results.filter(r => r.score >= currentThreshold);
        
        console.log(`Final results count: ${filteredResults.length}`);
        
        return {
          data: filteredResults,
          count: filteredResults.length
        };
      } else {
        console.log('Search returned no data or an empty array.');
        return { data: [], count: 0 };
      }
    } catch (error) {
      console.error('Error during semantic search:', error);
      return { data: [], count: 0 };
    }
  } catch (error) {
    console.error('Semantic search error:', error);
    return { data: [], count: 0 };
  }
}
