import { getServerSupabase } from '../../lib/supabase';
import { enhanceQueryForSemanticSearch } from '../../lib/search/query-processor';
import { generateEmbedding } from '../../lib/embeddings';
import { EMBEDDING_PROVIDERS } from '../../config/embeddings';
import { createHighlightedSnippet } from './search-utils';

/**
 * API endpoint to get top relevant documents for a specific query
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = getServerSupabase();
    if (!supabase) {
      return res.status(500).json({ error: 'Supabase configuration error' });
    }

    // Get the query from request, with default topics if none specified
    const { query = 'latest documents', limit = 5 } = req.query;
    const parsedLimit = Math.min(parseInt(limit, 10) || 5, 10); // Maximum of 10 for performance
    console.log(`Fetching top relevant documents for query: "${query}" with limit: ${parsedLimit}`);

    // Try semantic search first (if query provided)
    if (query && query.trim() !== '') {
      try {
        // Generate embedding for the query
        const enhancedQuery = enhanceQueryForSemanticSearch(query);
        console.log('Enhanced query:', enhancedQuery.enhancedQuery || query);
        
        const queryEmbedding = await generateEmbedding(
          enhancedQuery.enhancedQuery || query,
          EMBEDDING_PROVIDERS.SBERT
        );
        
        // Set a timeout for the RPC call (5 seconds)
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('RPC call timed out after 5s')), 5000)
        );
        
        // Create the RPC call promise
        const rpcPromise = supabase.rpc('match_document_chunks', {
          query_embedding: queryEmbedding,
          match_threshold: 0.1, // Very low threshold to ensure we get results
          match_count: 10,     // Reduced count
          p_file_type_filter: null // No file type filter
        });
        
        // Race between the timeout and the RPC call
        let { data, error } = await Promise.race([rpcPromise, timeoutPromise])
          .catch(err => {
            console.error('Top documents RPC call failed or timed out:', err.message);
            return { error: { message: err.message, code: 'TIMEOUT' } };
          });

        if (!error && data && data.length > 0) {
          console.log(`Semantic search found ${data.length} chunks for top documents`);
          
          // Group by document to get unique documents
          const documentMap = {};
          
          // Process results and pick the best chunks per document
          for (const match of data) {
            const docId = match.document_id;
            
            if (!documentMap[docId] || documentMap[docId].similarity < match.similarity) {
              const hasDirectDocFields = match.doc_filename !== undefined;
              
              const snippet = createHighlightedSnippet(match.content || match.chunk_text || '', query, 200);
              
              documentMap[docId] = {
                id: match.id,
                document_id: docId,
                title: hasDirectDocFields ? match.doc_filename : 'Untitled Document',
                filename: hasDirectDocFields ? match.doc_filename : 'unknown.file',
                filetype: hasDirectDocFields ? match.doc_file_type : 'unknown',
                filesize: hasDirectDocFields ? match.doc_file_size : 0,
                snippet,
                similarity: match.similarity,
                metadata: hasDirectDocFields ? match.doc_metadata : {}
              };
            }
          }

          // If we have document map entries, return them
          if (Object.keys(documentMap).length > 0) {
            // Sort by relevance and pick the top documents
            const topDocuments = Object.values(documentMap)
              .sort((a, b) => b.similarity - a.similarity)
              .slice(0, parsedLimit);
            
            return res.status(200).json({ documents: topDocuments });
          }
        } else {
          console.log('Semantic search failed or returned no results, falling back to recent documents');
        }
      } catch (semanticError) {
        console.error('Error in semantic search for top documents:', semanticError);
        // Continue to fallback
      }
    }

    // FALLBACK: Get recent documents if semantic search fails or returns no results
    console.log('Using fallback: fetching recent documents');
    try {
      const { data: recentDocs, error: recentError } = await supabase
        .from('documents')
        .select(`
          id,
          filename,
          file_type,
          file_size,
          created_at,
          metadata
        `)
        .order('created_at', { ascending: false })
        .limit(parsedLimit);
      
      if (recentError) {
        console.error('Error fetching recent documents:', recentError);
        return res.status(500).json({ error: 'Failed to fetch recent documents' });
      }
      
      if (!recentDocs || recentDocs.length === 0) {
        return res.status(200).json({ documents: [] });
      }
      
      // Format recent documents to match expected output format
      const formattedDocs = recentDocs.map(doc => ({
        id: doc.id,
        document_id: doc.id,
        title: doc.filename || 'Untitled Document',
        filename: doc.filename || 'unknown.file',
        filetype: doc.file_type || 'unknown',
        filesize: doc.file_size || 0,
        snippet: `<p>Recently added document: ${doc.filename || 'Untitled'}</p>`,
        similarity: 0.5, // Default similarity for recent docs
        metadata: doc.metadata || {},
        isRecent: true
      }));
      
      return res.status(200).json({ documents: formattedDocs });
      
    } catch (fallbackError) {
      console.error('Error in fallback for top documents:', fallbackError);
      return res.status(500).json({ error: 'Failed to fetch documents' });
    }
  } catch (error) {
    console.error('Error in top-relevant-documents API:', error);
    return res.status(500).json({ error: 'Failed to fetch top documents' });
  }
}