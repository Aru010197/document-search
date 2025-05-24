import { getServerSupabase } from '../../lib/supabase';
import { rerankResults, findParaphrases } from '../../lib/embeddings/cross-encoder.js';

/**
 * API endpoint for reranking search results using Cross-Encoder models
 * and finding paraphrases in document content
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Rerank API called with body:', req.body);
    
    // Validate Supabase configuration
    const supabase = getServerSupabase();
    if (!supabase) {
      console.error('Supabase configuration error');
      return res.status(500).json({ 
        error: 'Supabase configuration error. Please check your environment variables.' 
      });
    }
    
    // Get operation type from request
    const { operation, query, results, texts, options } = req.body;
    
    if (!operation) {
      return res.status(400).json({ error: 'Operation type is required' });
    }
    
    // Handle different operations
    switch (operation) {
      case 'rerank':
        // Validate required parameters
        if (!query || !results || !Array.isArray(results)) {
          return res.status(400).json({ 
            error: 'Query and results array are required for reranking' 
          });
        }
        
        // Set default options for improved relevance scoring
        const defaultOptions = {
          semanticWeight: 0.8,  // 80% weight for semantic matching
          phraseBoost: 1.5,     // 50% boost for phrase matches
          ...options
        };
        
        // Rerank the results with enhanced relevance scoring
        console.log(`Reranking ${results.length} results for query: "${query}"`);
        const rerankedResults = await rerankResults(query, results, defaultOptions);
        
        return res.status(200).json({
          rerankedResults,
          originalCount: results.length,
          rerankedCount: rerankedResults.length
        });
        
      case 'paraphrase':
        // Validate required parameters
        if (!texts || !Array.isArray(texts)) {
          return res.status(400).json({ 
            error: 'Array of texts is required for paraphrase mining' 
          });
        }
        
        // Find paraphrases
        console.log(`Finding paraphrases among ${texts.length} texts`);
        const paraphrases = await findParaphrases(texts, options || {});
        
        return res.status(200).json({
          paraphrases,
          totalTexts: texts.length,
          paraphraseCount: paraphrases.length
        });
        
      default:
        return res.status(400).json({ 
          error: `Unknown operation: ${operation}. Supported operations are 'rerank' and 'paraphrase'` 
        });
    }
  } catch (error) {
    console.error('Error in rerank API:', error);
    return res.status(500).json({ 
      error: `Failed to perform operation: ${error.message}` 
    });
  }
}
