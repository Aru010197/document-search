/**
 * Cross-Encoder (Reranker) Implementation
 * 
 * This module provides functionality for reranking search results.
 * The original TensorFlow.js-based model loading and embedding generation have been removed
 * to ensure compatibility with environments like Vercel.
 * Reranking now relies on text-based similarity metrics.
 */

/**
 * Calculate similarity scores between query and documents using text-based methods.
 * 
 * @param {string} query - The search query
 * @param {Array<Object>} documents - Array of document objects with text content
 * @param {Object} options - Additional options
 * @returns {Promise<Array<Object>>} - Documents with similarity scores
 */
async function calculateSimilarityScores(query, documents, options = {}) {
  const { 
    textField = 'content', 
    scoreField = 'score',
    semanticWeight = 0.8,  // Weight for semantic matching (0.8 = 80% semantic, 20% lexical)
    phraseBoost = 1.5      // Boost factor for phrase matches
  } = options;
  
  // Directly use the text-based similarity approach
  console.log('Using text-based similarity for scoring...');
  
  try {
    const scoredDocuments = documents.map(doc => {
      const docText = doc[textField] || '';
      
      // Normalize texts
      const normalizedQuery = query.toLowerCase();
      const normalizedDocText = docText.toLowerCase();
      
      // Check for exact phrase matches (highest priority)
      const phraseMatchScore = checkPhraseMatches(normalizedQuery, normalizedDocText, phraseBoost);
      
      // Process query to extract key terms and remove stopwords
      const { keyTerms } = processQueryTerms(normalizedQuery); // stopwords not directly used here but processed
      
      // Calculate semantic match score based on key terms
      const keyTermMatchScore = calculateKeyTermMatchScore(keyTerms, normalizedDocText);
      
      // Calculate a weighted combined score
      // Semantic matching gets higher weight, phrase matches are boosted
      const combinedScore = (semanticWeight * phraseMatchScore) + 
                           ((1 - semanticWeight) * keyTermMatchScore);
      
      return {
        ...doc,
        [scoreField]: combinedScore,
        phraseMatchScore,  // Include component scores for debugging
        keyTermMatchScore
      };
    }).sort((a, b) => b[scoreField] - a[scoreField]);

    return scoredDocuments;

  } catch (error) {
    console.error('Error calculating text-based similarity scores:', error);
    // Fallback: return original documents with default scores
    return documents.map(doc => ({
      ...doc,
      [scoreField]: 0.5 // Default middle score
    }));
  }
}

/**
 * Rerank search results
 * 
 * @param {string} query - The search query
 * @param {Array<Object>} results - Initial search results to rerank
 * @param {Object} options - Additional options
 * @returns {Promise<Array<Object>>} - Reranked search results
 */
async function rerankResults(query, results, options = {}) {
  if (!results || results.length === 0) {
    return [];
  }
  
  console.log(`Reranking ${results.length} results using text-based similarity...`);
  
  try {
    // Determine the field where the model's raw score will be stored.
    const modelScoreField = options.scoreField || 'rerankerScore';

    const itemsWithModelScore = await calculateSimilarityScores(query, results, {
      ...options, 
      scoreField: modelScoreField 
    });

    let finalResults;

    if (options.combineScores && results.length > 0 && typeof results[0].score === 'number') {
      const alpha = options.alpha || 0.7; 
      
      finalResults = itemsWithModelScore.map(doc => {
        const originalScore = doc.score; 
        const modelScoreValue = doc[modelScoreField]; 
        
        const validOriginalScore = (typeof originalScore === 'number' && !isNaN(originalScore)) ? originalScore : 0;
        const validModelScore = (typeof modelScoreValue === 'number' && !isNaN(modelScoreValue)) ? modelScoreValue : 0;

        const combinedScoreValue = (alpha * validModelScore) + ((1 - alpha) * validOriginalScore);
        
        return {
          ...doc,
          score: combinedScoreValue, 
        };
      });
    } else {
      finalResults = itemsWithModelScore.map(doc => {
        const modelScoreValue = doc[modelScoreField];
        const validModelScore = (typeof modelScoreValue === 'number' && !isNaN(modelScoreValue)) ? modelScoreValue : 0;
        return {
          ...doc,
          score: validModelScore, 
        };
      });
    }
    
    return finalResults.sort((a, b) => (b.score || 0) - (a.score || 0));

  } catch (error) {
    console.error('Error reranking results:', error);
    return results.map(r => ({...r, score: (typeof r.score === 'number' && !isNaN(r.score) ? r.score : 0) }))
                  .sort((a,b) => (b.score || 0) - (a.score || 0)); 
  }
}

/**
 * Find paraphrases in a corpus of texts - Functionality removed due to TF.js dependency removal.
 * 
 * @param {Array<string>} texts - Array of text strings to compare
 * @param {Object} options - Additional options
 * @returns {Promise<Array<Object>>} - Empty array
 */
async function findParaphrases(texts, options = {}) {
  console.log('findParaphrases functionality has been removed as it depended on TensorFlow.js.');
  return []; // Return empty array as model-based paraphrase detection is removed
}

/**
 * Check for exact phrase matches between query and document text
 * 
 * @param {string} query - The search query
 * @param {string} docText - The document text
 * @param {number} phraseBoost - Boost factor for phrase matches
 * @returns {number} - Phrase match score (0-1)
 */
function checkPhraseMatches(query, docText, phraseBoost = 1.5) {
  // Check for the entire query as a phrase
  const hasExactMatch = docText.includes(query);

  // If there's an exact match, give it a high score with the boost
  if (hasExactMatch) {
    return Math.min(0.95, 0.8 * phraseBoost); // Cap at 0.95
  }

  // Check for multi-word phrases (2+ words)
  const queryWords = query.split(/\s+/);
  if (queryWords.length >= 2) {
    let phraseMatchCount = 0;
    let totalPhrases = 0;

    // Check for matches of consecutive words (phrases)
    for (let i = 0; i < queryWords.length - 1; i++) {
      const phrase = queryWords[i] + ' ' + queryWords[i + 1];
      if (phrase.length > 5) { // Only consider meaningful phrases
        totalPhrases++;
        if (docText.includes(phrase)) {
          phraseMatchCount++;
        }
      }
    }

    // If we found phrase matches, calculate a score
    if (totalPhrases > 0 && phraseMatchCount > 0) {
      return Math.min(0.95, (phraseMatchCount / totalPhrases) * phraseBoost * 0.7); // Cap at 0.95
    }
  }

  return 0.0; // No phrase matches
}

/**
 * Process query to extract key terms and remove stopwords
 * 
 * @param {string} query - The search query
 * @returns {Object} - Object with keyTerms and stopwords arrays
 */
function processQueryTerms(query) {
  // Common stopwords that have low semantic value
  const STOPWORDS = new Set([
    'a', 'equipped', 'an','','collate', 'decks', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'and', 'for', 'with',
    'by', 'about', 'as', 'into', 'like', 'through', 'after', 'over', 'between','use case','use cases','usecases','usecase',
    'out', 'of', 'from', 'up', 'down', 'is', 'are', 'was', 'were', 'be', 'been',
    'being', 'have', 'has', 'had', 'do', 'does', 'did', 'can', 'could', 'will', 'find',
    'would', 'should', 'shall', 'may', 'might', 'must', 'that', 'which', 'who',
    'whom', 'whose', 'this', 'these', 'those', 'am', 'i', 'we', 'you', 'he', 'she',
    'they', 'it', 'me', 'us', 'him', 'her', 'them', 'my', 'our', 'your', 'his', 'files', 'file',
    'use', 'driven', 'all', 'extract','its', , 'related', 'their', 'mine', 'ours', 'yours', 'hers', 'theirs', 'give', 'get', 'show', 'me', 'ppt', 'doc', 'documment', 'documents'
  ]);

  // Load domain-specific terms from JSON file
  // Note: In a Node.js environment, you would use fs.readFileSync.
  // For browser/Next.js, this approach assumes the JSON is bundled or fetched.
  // If this code runs server-side during build or in a Node.js environment (e.g. Netlify functions),
  // direct file system access is possible.
  let DOMAIN_TERMS = [];
  try {
    // This path needs to be resolvable from where this script is executed.
    // For Netlify functions, files included in the function bundle can be accessed.
    // If domain-terms.json is in the same directory or a known relative path:
    const fs = require('fs');
    const path = require('path');
    const domainTermsPath = path.resolve(__dirname, 'domain-terms.json');
    if (fs.existsSync(domainTermsPath)) {
      DOMAIN_TERMS = JSON.parse(fs.readFileSync(domainTermsPath, 'utf-8'));
    } else {
      console.warn('domain-terms.json not found at expected path:', domainTermsPath, '. Proceeding without domain terms.');
    }
  } catch (error) {
    console.error('Error loading domain-terms.json:', error, '. Proceeding without domain terms.');
  }
  
  // Split query into words
  const words = query.split(/\\s+/);
  
  // Separate key terms and stopwords
  const keyTerms = [];
  const stopwords = [];
  
  words.forEach(word => {
    if (word.length <= 2 || STOPWORDS.has(word.toLowerCase())) {
      stopwords.push(word);
    } else {
      keyTerms.push(word);
    }
  });
  
  return { keyTerms, stopwords };
}

/**
 * Calculate a match score based on key terms
 * 
 * @param {Array<string>} keyTerms - Array of key terms from the query
 * @param {string} docText - The document text
 * @returns {number} - Match score (0-1)
 */
function calculateKeyTermMatchScore(keyTerms, docText) {
  if (!keyTerms || keyTerms.length === 0) {
    return 0.0;
  }
  
  // Count matching terms
  let matchCount = 0;
  let weightedMatchCount = 0;
  
  for (const term of keyTerms) {
    // Check if the term appears in the document
    if (docText.includes(term)) {
      matchCount++;
      
      // Calculate term frequency (how many times the term appears)
      const regex = new RegExp(term, 'gi');
      const matches = docText.match(regex);
      const termFrequency = matches ? matches.length : 0;
      
      // Weight by term frequency (with diminishing returns)
      weightedMatchCount += Math.min(1.0, 0.5 + (termFrequency / 10));
    }
  }
  
  // Calculate proximity bonus for terms appearing close together
  let proximityBonus = 0;
  if (keyTerms.length >= 2 && matchCount >= 2) {
    // Check if any pair of terms appears within 50 characters of each other
    for (let i = 0; i < keyTerms.length; i++) {
      for (let j = i + 1; j < keyTerms.length; j++) {
        const term1 = keyTerms[i];
        const term2 = keyTerms[j];
        
        // Look for term1 followed by term2 within 50 chars
        const proximityRegex = new RegExp(`${term1}[\\s\\S]{1,50}${term2}|${term2}[\\s\\S]{1,50}${term1}`, 'gi');
        const proximityMatches = docText.match(proximityRegex);
        
        if (proximityMatches) {
          proximityBonus += 0.1 * proximityMatches.length; // 0.1 bonus per proximity match
        }
      }
    }
  }
  
  // Calculate final score with proximity bonus
  const baseScore = keyTerms.length > 0 ? weightedMatchCount / keyTerms.length : 0;
  return Math.min(0.95, baseScore + proximityBonus); // Cap at 0.95
}

module.exports = {
  calculateSimilarityScores,
  rerankResults,
  findParaphrases, // Will now return [], was dependent on TF model
  // loadModel, // Removed
  // Export helper functions for testing or if used elsewhere
  checkPhraseMatches,
  processQueryTerms,
  calculateKeyTermMatchScore
};
