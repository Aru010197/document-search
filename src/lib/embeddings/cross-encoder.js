/**
 * Cross-Encoder (Reranker) Implementation
 * 
 * This module provides functionality for reranking search results using the Universal Sentence Encoder model,
 * which computes similarity scores between text pairs.
 */

const tf = require('@tensorflow/tfjs-node');
const { loadGraphModel } = require('@tensorflow/tfjs-node');

// Default model URL - using a TensorFlow.js compatible model
const DEFAULT_MODEL_URL = 'https://storage.googleapis.com/tfjs-models/savedmodel/universal_sentence_encoder/model.json';

// Cache for loaded models
const modelCache = {};

/**
 * Load the Universal Sentence Encoder model
 * 
 * @param {string} modelUrl - URL to the TensorFlow.js model
 * @returns {Promise<Object>} - The loaded model
 */
async function loadModel(modelUrl = DEFAULT_MODEL_URL) {
  if (modelCache[modelUrl]) {
    return modelCache[modelUrl];
  }
  
  try {
    console.log(`Loading Universal Sentence Encoder model from ${modelUrl}...`);
    const model = await loadGraphModel(modelUrl);
    modelCache[modelUrl] = model;
    console.log('Model loaded successfully');
    return model;
  } catch (error) {
    console.error('Error loading model:', error);
    throw error;
  }
}

/**
 * Generate embeddings for a batch of texts
 * 
 * @param {Array<string>} texts - Array of text strings
 * @param {Object} model - The loaded model
 * @returns {Promise<tf.Tensor>} - Tensor of embeddings
 */
async function generateEmbeddings(texts, model) {
  // Preprocess texts (trim, lowercase)
  const preprocessedTexts = texts.map(text => 
    text.trim().toLowerCase().substring(0, 1000) // Limit length to avoid issues
  );

  // The Universal Sentence Encoder model requires specific input format with 2 tensors
  const validLength = preprocessedTexts.length > 0 ? preprocessedTexts.length : 1;
  const dummySecondInput = tf.zeros([validLength], 'int32').reshape([-1]); // Explicitly use int32 data type
  const indices = tf.tensor2d(
    preprocessedTexts.map((_, i) => [i, 0]),
    [validLength, 2],
    'int32' // Explicitly set dtype to int32
  );

  try {
    // Generate embeddings using executeAsync for dynamic operations
    const embeddings = await model.executeAsync({
      indices,
      values: dummySecondInput
    });

    // Clean up tensors
    dummySecondInput.dispose();
    indices.dispose();

    return embeddings;
  } catch (error) {
    console.error('Error in model prediction:', error);
    
    // Clean up tensors
    dummySecondInput.dispose();
    indices.dispose();

    // Try alternative approaches if the first method fails
    try {
      console.log('Trying alternative input format...');
      
      // Create new tensors for the alternative approach
      const altDummyInput = tf.zeros([validLength], 'int32').reshape([-1]);
      const altIndices = tf.tensor2d(
        preprocessedTexts.map((_, i) => [i, 0]),
        [validLength, 2],
        'int32'
      );
      
      // Try with executeAsync again
      const result = await model.executeAsync({
        indices: altIndices,
        values: altDummyInput
      });
      
      // Clean up tensors
      altDummyInput.dispose();
      altIndices.dispose();
      
      return result;
    } catch (innerError) {
      console.error('Alternative input format failed:', innerError);
      
      // Try one more approach with tensor2d
      try {
        console.log('Trying tensor2d approach...');
        
        // Reshape input to match expected dimensions
        const reshapedInput = tf.tensor2d(preprocessedTexts, [preprocessedTexts.length, 1]);
        const embeddings = await model.predict(reshapedInput);
        
        // Clean up tensor
        reshapedInput.dispose();
        
        return embeddings;
      } catch (finalError) {
        console.error('All embedding approaches failed:', finalError);
        
        // Return a fallback embedding (zeros)
        console.log('Using fallback zero embeddings');
        return tf.zeros([preprocessedTexts.length, 512]);
      }
    }
  }
}

/**
 * Calculate cosine similarity between two tensors
 * 
 * @param {tf.Tensor} a - First tensor
 * @param {tf.Tensor} b - Second tensor
 * @returns {tf.Tensor} - Tensor of similarity scores
 */
function cosineSimilarity(a, b) {
  // Normalize the vectors
  const normA = tf.norm(a, 2, 1, true);
  const normB = tf.norm(b, 2, 1, true);
  
  const normalizedA = tf.div(a, normA);
  const normalizedB = tf.div(b, normB);
  
  // Calculate dot product
  const similarity = tf.matMul(normalizedA, normalizedB, false, true);
  
  // Clean up intermediate tensors
  normA.dispose();
  normB.dispose();
  normalizedA.dispose();
  normalizedB.dispose();
  
  return similarity;
}

/**
 * Calculate similarity scores between query and documents
 * 
 * @param {string} query - The search query
 * @param {Array<Object>} documents - Array of document objects with text content
 * @param {Object} options - Additional options
 * @returns {Promise<Array<Object>>} - Documents with similarity scores
 */
async function calculateSimilarityScores(query, documents, options = {}) {
  const { 
    modelUrl = DEFAULT_MODEL_URL, 
    textField = 'content', 
    scoreField = 'score',
    semanticWeight = 0.8,  // Weight for semantic matching (0.8 = 80% semantic, 20% lexical)
    phraseBoost = 1.5      // Boost factor for phrase matches
  } = options;
  
  try {
    // Load model
    const model = await loadModel(modelUrl);
    
    // Extract text content from documents
    const texts = documents.map(doc => doc[textField] || '');
    
    // Add query to the beginning
    const allTexts = [query, ...texts];
    
    try {
      // Generate embeddings for all texts
      const embeddings = await generateEmbeddings(allTexts, model);
      
      // Extract query embedding and document embeddings
      const queryEmbedding = tf.slice(embeddings, [0, 0], [1, embeddings.shape[1]]);
      const docEmbeddings = tf.slice(embeddings, [1, 0], [texts.length, embeddings.shape[1]]);
      
      // Calculate similarity scores
      const similarities = cosineSimilarity(queryEmbedding, docEmbeddings);
      
      // Convert to array
      const scores = Array.from(await similarities.array())[0];
      
      // Clean up tensors
      embeddings.dispose();
      queryEmbedding.dispose();
      docEmbeddings.dispose();
      similarities.dispose();
      
      // Add scores to documents
      const scoredDocuments = documents.map((doc, i) => ({
        ...doc,
        [scoreField]: scores[i]
      }));
      
      // Sort by score (descending)
      scoredDocuments.sort((a, b) => b[scoreField] - a[scoreField]);
      
      return scoredDocuments;
    } catch (embeddingError) {
      console.error('Error during embedding or similarity calculation:', embeddingError);
      
      // If we have a vector dimension mismatch, use a simpler approach
      if (embeddingError.message && (
          embeddingError.message.includes('different vector dimensions') ||
          embeddingError.message.includes('Input tensor count mismatch') ||
          embeddingError.message.includes('The shape of dict')
      )) {
        console.log('Vector dimension mismatch detected. Using simple text similarity...');
        
        // Use an enhanced text similarity approach as fallback
        return documents.map(doc => {
          const docText = doc[textField] || '';
          
          // Normalize texts
          const normalizedQuery = query.toLowerCase();
          const normalizedDocText = docText.toLowerCase();
          
          // Check for exact phrase matches (highest priority)
          const phraseMatchScore = checkPhraseMatches(normalizedQuery, normalizedDocText, phraseBoost);
          
          // Process query to extract key terms and remove stopwords
          const { keyTerms, stopwords } = processQueryTerms(normalizedQuery);
          
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
      }
      
      // Re-throw other errors
      throw embeddingError;
    }
  } catch (error) {
    console.error('Error calculating similarity scores:', error);
    
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
  
  console.log(`Reranking ${results.length} results...`);
  
  try {
    // Determine the field where the cross-encoder model's raw score will be stored.
    const modelScoreField = options.scoreField || 'rerankerScore';

    // The 'results' parameter contains items, each expected to have an existing 'score' 
    // (this is the original semantic or keyword score passed from search.js).
    // calculateSimilarityScores will compute the cross-encoder model's score and store it 
    // in the field specified by 'modelScoreField' (e.g., 'rerankerScore').
    const itemsWithModelScore = await calculateSimilarityScores(query, results, {
      ...options, // Pass through other options like textField
      scoreField: modelScoreField 
    });

    // itemsWithModelScore is an array of documents, each now having:
    // - doc.score: The original score (e.g., semantic similarity from Supabase).
    // - doc[modelScoreField]: The raw score from the cross-encoder model (e.g., doc.rerankerScore).

    let finalResults;

    // Check if scores should be combined.
    // This relies on 'combineScores' being true in options and the first result having an original 'score'.
    if (options.combineScores && results.length > 0 && typeof results[0].score === 'number') {
      const alpha = options.alpha || 0.7; // Weight for the reranker model's score.
      
      finalResults = itemsWithModelScore.map(doc => {
        const originalScore = doc.score; // The score before reranking (e.g., from semantic search).
        const modelScoreValue = doc[modelScoreField]; // The score from the reranker model.
        
        // Ensure scores are numeric, defaulting to 0 if not.
        const validOriginalScore = (typeof originalScore === 'number' && !isNaN(originalScore)) ? originalScore : 0;
        const validModelScore = (typeof modelScoreValue === 'number' && !isNaN(modelScoreValue)) ? modelScoreValue : 0;

        // Calculate the combined score.
        const combinedScoreValue = (alpha * validModelScore) + ((1 - alpha) * validOriginalScore);
        
        return {
          ...doc,
          score: combinedScoreValue, // The main 'score' field is updated to the combined score.
          // The raw model score remains in doc[modelScoreField] (e.g., doc.rerankerScore) for logging/debugging.
        };
      });
    } else {
      // If not combining scores (or if original scores were not present),
      // use the reranker model's score as the primary score.
      finalResults = itemsWithModelScore.map(doc => {
        const modelScoreValue = doc[modelScoreField];
        const validModelScore = (typeof modelScoreValue === 'number' && !isNaN(modelScoreValue)) ? modelScoreValue : 0;
        return {
          ...doc,
          score: validModelScore, // The main 'score' field becomes the reranker model's score.
        };
      });
    }
    
    // Sort the final results by the (now primary) 'score' field in descending order.
    return finalResults.sort((a, b) => (b.score || 0) - (a.score || 0));

  } catch (error) {
    console.error('Error reranking results:', error);
    // Fallback: Return original results, ensuring 'score' is numeric and sorting them.
    return results.map(r => ({...r, score: (typeof r.score === 'number' && !isNaN(r.score) ? r.score : 0) }))
                  .sort((a,b) => (b.score || 0) - (a.score || 0)); 
  }
}

/**
 * Find paraphrases in a corpus of texts
 * 
 * @param {Array<string>} texts - Array of text strings to compare
 * @param {Object} options - Additional options
 * @returns {Promise<Array<Object>>} - Array of paraphrase pairs with similarity scores
 */
async function findParaphrases(texts, options = {}) {
  const { threshold = 0.85, maxPairs = 1000, modelUrl = DEFAULT_MODEL_URL } = options;
  
  if (!texts || texts.length < 2) {
    return [];
  }
  
  console.log(`Finding paraphrases among ${texts.length} texts...`);
  
  try {
    // Load model
    const model = await loadModel(modelUrl);
    
    try {
      // Generate embeddings for all texts
      const embeddings = await generateEmbeddings(texts, model);
      
      // Calculate pairwise similarities
      const similarities = cosineSimilarity(embeddings, embeddings);
      
      // Convert to array
      const similarityMatrix = await similarities.array();
      
      // Generate all possible pairs (avoiding duplicates and self-comparisons)
      const pairs = [];
      for (let i = 0; i < texts.length; i++) {
        for (let j = i + 1; j < texts.length; j++) {
          const similarity = similarityMatrix[i][j];
          
          // Only keep pairs above threshold
          if (similarity >= threshold) {
            pairs.push({
              text1: texts[i],
              text2: texts[j],
              index1: i,
              index2: j,
              score: similarity
            });
          }
        }
      }
      
      // Clean up tensors
      embeddings.dispose();
      similarities.dispose();
      
      // Sort by score (descending) and limit
      pairs.sort((a, b) => b.score - a.score);
      return pairs.slice(0, maxPairs);
    } catch (embeddingError) {
      console.error('Error during embedding or similarity calculation:', embeddingError);
      
      // If we have a vector dimension mismatch, use a simpler approach
      if (embeddingError.message && (
          embeddingError.message.includes('different vector dimensions') ||
          embeddingError.message.includes('Input tensor count mismatch') ||
          embeddingError.message.includes('The shape of dict')
      )) {
        console.log('Vector dimension mismatch detected. Using simple text similarity for paraphrases...');
        
        // Use a simple text similarity approach as fallback
        const pairs = [];
        
        // Compare all pairs of texts
        for (let i = 0; i < texts.length; i++) {
          for (let j = i + 1; j < texts.length; j++) {
            const text1 = texts[i].toLowerCase();
            const text2 = texts[j].toLowerCase();
            
            // Calculate word overlap
            const words1 = text1.split(/\s+/).filter(w => w.length > 2);
            const words2 = text2.split(/\s+/).filter(w => w.length > 2);
            
            // Count matching words
            let matchCount = 0;
            for (const word of words1) {
              if (words2.includes(word)) {
                matchCount++;
              }
            }
            
            // Calculate a simple similarity score
            const totalWords = Math.max(words1.length, words2.length);
            const simScore = totalWords > 0 ? matchCount / totalWords : 0;
            
            // Only keep pairs above threshold
            if (simScore >= threshold) {
              pairs.push({
                text1: texts[i],
                text2: texts[j],
                index1: i,
                index2: j,
                score: simScore
              });
            }
          }
        }
        
        // Sort by score (descending) and limit
        pairs.sort((a, b) => b.score - a.score);
        return pairs.slice(0, maxPairs);
      }
      
      // Re-throw other errors
      throw embeddingError;
    }
  } catch (error) {
    console.error('Error finding paraphrases:', error);
    return [];
  }
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

// Domain-specific terms that should be kept together
const DOMAIN_TERMS = [
  'health care', 'voice ai', 'cloud', 'healthcare', 'case study', 'case studies', 'machine learning',
  'artificial intelligence', 'data science', 'natural language processing',
  'computer vision', 'deep learning', 'neural network', 'big data',
  'data analytics', 'business intelligence', 'cloud computing', 'internet of things',
  'blockchain', 'virtual reality', 'augmented reality', 'mixed reality',
  'quantum computing', 'edge computing', 'cyber security', 'information security',
  'data privacy', 'digital transformation', 'user experience', 'user interface',
  'mobile app', 'web application', 'software development', 'agile methodology',
  'devops', 'continuous integration', 'continuous deployment', 'microservices',
  'serverless architecture', 'container orchestration', 'docker', 'kubernetes',
  'public health', 'mental health', 'primary care', 'secondary care', 'tertiary care',
  'preventive care', 'palliative care', 'emergency care', 'intensive care',
  'patient care', 'medical research', 'clinical trial', 'pharmaceutical',
  'medical device', 'health insurance', 'electronic health record', 'telemedicine',
  'remote patient monitoring', 'wearable technology', 'health informatics',
  'population health', 'precision medicine', 'personalized medicine',
  'genomic medicine', 'regenerative medicine', 'stem cell therapy', 'gene therapy',
  'immunotherapy', 'radiation therapy', 'chemotherapy', 'surgical procedure',
  'minimally invasive surgery', 'robotic surgery', 'diagnostic imaging',
  'medical imaging', 'laboratory testing', 'pathology', 'radiology', 'cardiology',
  'neurology', 'oncology', 'pediatrics', 'geriatrics', 'obstetrics', 'gynecology',
  'orthopedics', 'dermatology', 'ophthalmology', 'psychiatry', 'psychology',
  'physical therapy', 'occupational therapy', 'speech therapy', 'respiratory therapy',
  'nutrition', 'dietetics', 'pharmacy', 'nursing', 'midwifery', 'dentistry',
  'optometry', 'audiology', 'social work', 'health administration', 'public health',
  'epidemiology', 'biostatistics', 'health policy', 'health economics',
  'health disparities', 'health equity', 'social determinants of health',
  'environmental health', 'occupational health', 'global health', 'one health',
  'zoonotic disease', 'infectious disease', 'chronic disease', 'non-communicable disease',
  'mental illness', 'substance abuse', 'addiction', 'rehabilitation', 'recovery',
  'wellness', 'prevention', 'screening', 'diagnosis', 'treatment', 'management',
  'palliative care', 'end of life care', 'hospice', 'long term care', 'home health',
  'assisted living', 'skilled nursing', 'inpatient', 'outpatient', 'ambulatory care',
  'emergency department', 'urgent care', 'primary care physician', 'specialist',
  'consultant', 'attending physician', 'resident physician', 'medical student',
  'nurse practitioner', 'physician assistant', 'registered nurse', 'licensed practical nurse',
  'certified nursing assistant', 'medical assistant', 'paramedic', 'emergency medical technician',
  'community health worker', 'patient navigator', 'care coordinator', 'case manager',
  'social worker', 'therapist', 'counselor', 'psychologist', 'psychiatrist',
  'pharmacist', 'pharmacy technician', 'dietitian', 'nutritionist', 'physical therapist',
  'occupational therapist', 'speech language pathologist', 'respiratory therapist',
  'radiologic technologist', 'laboratory technician', 'phlebotomist', 'medical coder',
  'medical biller', 'health information technician', 'health educator', 'public health worker',
  'epidemiologist', 'biostatistician', 'health policy analyst', 'health economist',
  'healthcare administrator', 'healthcare executive', 'hospital administrator',
  'practice manager', 'clinic manager', 'department chair', 'chief medical officer',
  'chief nursing officer', 'chief executive officer', 'chief financial officer',
  'chief information officer', 'chief technology officer', 'chief operating officer',
  'board of directors', 'governing board', 'stakeholder', 'shareholder', 'investor',
  'payer', 'provider', 'supplier', 'vendor', 'contractor', 'consultant', 'advisor', 'pharma'
];
  
  // Split query into words
  const words = query.split(/\s+/);
  
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
  findParaphrases,
  loadModel,
  // Export helper functions for testing
  checkPhraseMatches,
  processQueryTerms,
  calculateKeyTermMatchScore
};
