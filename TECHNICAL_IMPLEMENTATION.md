# Technical Implementation of AI Search Features

This document provides a detailed technical overview of how the AI-powered search features are implemented in the Document Search application.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Cross-Encoder Implementation](#cross-encoder-implementation)
3. [Reranking API](#reranking-api)
4. [Search Integration](#search-integration)
5. [Paraphrase Mining](#paraphrase-mining)
6. [Semantic Textual Similarity](#semantic-textual-similarity)
7. [Frontend Components](#frontend-components)
8. [Performance Optimizations](#performance-optimizations)

## Architecture Overview

The AI search features are built on a layered architecture:

1. **Model Layer**: Implements the Cross-Encoder model for text pair scoring
2. **API Layer**: Provides endpoints for reranking, paraphrase mining, and similarity calculation
3. **Integration Layer**: Connects the AI features to the existing search functionality
4. **UI Layer**: Provides user interfaces for interacting with the AI features

## Cross-Encoder Implementation

The Cross-Encoder functionality is implemented in `src/lib/embeddings/cross-encoder.js`.

### Key Components

```javascript
// Core reranking function
async function rerankResults(query, results, options = {}) {
  // Extract text from results based on options
  const texts = results.map(result => getTextFromResult(result, options.textField || 'content'));
  
  // Create text pairs (query + each result text)
  const textPairs = texts.map(text => [query, text]);
  
  // Score all pairs using the Cross-Encoder model
  const scores = await scoreTextPairs(textPairs);
  
  // Combine original scores with Cross-Encoder scores
  const rerankedResults = results.map((result, index) => {
    const rerankerScore = scores[index];
    let finalScore = rerankerScore;
    
    // Optionally combine with original score
    if (options.combineScores && result.score) {
      finalScore = combineScores(rerankerScore, result.score, options.alpha || 0.7);
    }
    
    return {
      ...result,
      rerankerScore,
      combinedScore: finalScore
    };
  });
  
  // Sort by the appropriate score
  const sortField = options.combineScores ? 'combinedScore' : 'rerankerScore';
  rerankedResults.sort((a, b) => b[sortField] - a[sortField]);
  
  return rerankedResults;
}

// Paraphrase mining function
async function findParaphrases(texts, options = {}) {
  const threshold = options.threshold || 0.8;
  const maxPairs = options.maxPairs || 1000;
  
  // Generate all possible text pairs
  const textPairs = [];
  for (let i = 0; i < texts.length; i++) {
    for (let j = i + 1; j < texts.length; j++) {
      textPairs.push([texts[i], texts[j]]);
    }
  }
  
  // Score all pairs using the Cross-Encoder model
  const scores = await scoreTextPairs(textPairs);
  
  // Create paraphrase objects with scores
  const paraphrases = textPairs.map((pair, index) => ({
    text1: pair[0],
    text2: pair[1],
    score: scores[index]
  }));
  
  // Filter by threshold and sort by score
  return paraphrases
    .filter(p => p.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxPairs);
}
```

### Model Loading and Scoring

The Cross-Encoder model is loaded using TensorFlow.js and optimized for browser execution:

```javascript
// Load the Cross-Encoder model
async function loadCrossEncoderModel() {
  if (crossEncoderModel) return crossEncoderModel;
  
  try {
    // Load the model from the specified path
    crossEncoderModel = await tf.loadGraphModel('/models/cross-encoder/model.json');
    return crossEncoderModel;
  } catch (error) {
    console.error('Error loading Cross-Encoder model:', error);
    throw error;
  }
}

// Score text pairs using the Cross-Encoder model
async function scoreTextPairs(textPairs) {
  const model = await loadCrossEncoderModel();
  
  // Process in batches to avoid memory issues
  const batchSize = 16;
  const scores = [];
  
  for (let i = 0; i < textPairs.length; i += batchSize) {
    const batch = textPairs.slice(i, i + batchSize);
    const batchScores = await scoreBatch(model, batch);
    scores.push(...batchScores);
  }
  
  return scores;
}
```

## Reranking API

The reranking API is implemented in `src/pages/api/rerank.js` and provides endpoints for both reranking search results and finding paraphrases.

### API Structure

```javascript
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
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
        
        // Rerank the results
        const rerankedResults = await rerankResults(query, results, options || {});
        
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
```

## Search Integration

The search functionality has been enhanced to support reranking in `src/pages/api/search.js`.

### Key Integration Points

```javascript
// In the search handler
const { 
  query, 
  filetype, 
  dateFrom, 
  dateTo, 
  author,
  page = 1, 
  limit = 10,
  useReranker = 'false' // New parameter to enable/disable reranking
} = req.query;

// After getting semantic search results
if (semanticResults.data && semanticResults.data.length > 0) {
  // Apply reranking if requested
  let finalResults = semanticResults.data;
  if (useReranker === 'true' && finalResults.length > 1) {
    console.log('Applying Cross-Encoder reranking to semantic search results...');
    try {
      const rerankedResults = await rerankResults(query, finalResults, {
        textField: 'content',
        scoreField: 'rerankerScore',
        combineScores: true,
        alpha: 0.7 // 70% reranker score, 30% original score
      });
      
      if (rerankedResults && rerankedResults.length > 0) {
        console.log('Reranking successful. New order may differ from original.');
        finalResults = rerankedResults;
      }
    } catch (rerankerError) {
      console.error('Error during reranking:', rerankerError);
      console.log('Using original results without reranking.');
    }
  }
  
  return res.status(200).json({
    results: finalResults,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: semanticResults.count,
      totalPages: Math.ceil(semanticResults.count / parseInt(limit))
    }
  });
}
```

## Paraphrase Mining

The paraphrase mining functionality is implemented using the Cross-Encoder model to find semantically similar text pairs.

### Implementation Details

1. **Text Pair Generation**: All possible pairs of input texts are generated
2. **Similarity Scoring**: Each pair is scored using the Cross-Encoder model
3. **Filtering**: Pairs with scores below the threshold are filtered out
4. **Sorting**: Remaining pairs are sorted by similarity score

## Semantic Textual Similarity

The semantic textual similarity feature uses the same Cross-Encoder model to compare two texts.

### Implementation Details

1. **Text Pair Creation**: The two input texts form a single pair
2. **Similarity Scoring**: The pair is scored using the Cross-Encoder model
3. **Score Interpretation**: The score is interpreted based on predefined thresholds

## Frontend Components

### Search Form with Reranker Toggle

The search form has been enhanced in `src/components/search/SearchForm.jsx` to include a toggle for the reranker:

```jsx
export default function SearchForm({ 
  initialQuery = '', 
  useReranker = false, 
  onSearch, 
  onRerankerToggle,
  className = '' 
}) {
  const [query, setQuery] = useState(initialQuery);
  const [reranker, setReranker] = useState(useReranker);
  
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
  
  return (
    <form onSubmit={handleSubmit}>
      {/* Search input */}
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search documents..."
      />
      
      {/* Reranker toggle */}
      <div>
        <input
          type="checkbox"
          id="useReranker"
          checked={reranker}
          onChange={handleRerankerToggle}
        />
        <label htmlFor="useReranker">
          <FaRobot />
          <span>Use AI Reranker</span>
        </label>
      </div>
      
      <button type="submit">Search</button>
    </form>
  );
}
```

### Search Results with Score Display

The search results component in `src/components/search/SearchResults.jsx` has been updated to display different types of scores:

```jsx
{/* Relevance score */}
<div className="mt-1 flex flex-wrap gap-2">
  {document.score && (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-100 text-primary-800">
      Relevance: {Math.round(document.score * 100)}%
    </span>
  )}
  {document.rerankerScore && (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
      <FaRobot className="mr-1 h-3 w-3" />
      AI Score: {Math.round(document.rerankerScore * 100)}%
    </span>
  )}
  {document.combinedScore && (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
      Combined: {Math.round(document.combinedScore * 100)}%
    </span>
  )}
</div>
```

### Paraphrase Mining Page

The paraphrase mining page in `src/pages/paraphrase.js` provides a user interface for finding similar text pairs:

```jsx
export default function ParaphrasePage() {
  const [texts, setTexts] = useState('');
  const [threshold, setThreshold] = useState(0.85);
  const [paraphrases, setParaphrases] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Split texts into an array
    const textArray = texts
      .split('\n')
      .map(t => t.trim())
      .filter(t => t.length > 0);
    
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/rerank', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operation: 'paraphrase',
          texts: textArray,
          options: {
            threshold: parseFloat(threshold),
            maxPairs: 1000
          }
        }),
      });
      
      const data = await response.json();
      setParaphrases(data.paraphrases || []);
      
    } catch (err) {
      console.error('Error finding paraphrases:', err);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Layout>
      <h1>Paraphrase Mining</h1>
      
      <form onSubmit={handleSubmit}>
        <textarea
          value={texts}
          onChange={(e) => setTexts(e.target.value)}
          placeholder="Enter multiple texts, one per line"
        />
        
        <input
          type="range"
          min="0.5"
          max="0.95"
          step="0.05"
          value={threshold}
          onChange={(e) => setThreshold(e.target.value)}
        />
        
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Finding Paraphrases...' : 'Find Paraphrases'}
        </button>
      </form>
      
      {paraphrases.length > 0 && (
        <div>
          <h2>Found {paraphrases.length} Paraphrases</h2>
          
          {paraphrases.map((pair, index) => (
            <div key={index}>
              <div>Similarity: {Math.round(pair.score * 100)}%</div>
              <div>{pair.text1}</div>
              <div>{pair.text2}</div>
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
}
```

### Semantic Textual Similarity Page

The similarity page in `src/pages/similarity.js` provides a user interface for comparing two texts:

```jsx
export default function SimilarityPage() {
  const [text1, setText1] = useState('');
  const [text2, setText2] = useState('');
  const [similarity, setSimilarity] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/rerank', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operation: 'paraphrase',
          texts: [text1, text2],
          options: {
            threshold: 0.0, // Set threshold to 0 to always return a result
            maxPairs: 1
          }
        }),
      });
      
      const data = await response.json();
      
      // If we got a paraphrase result, use its score
      if (data.paraphrases && data.paraphrases.length > 0) {
        setSimilarity(data.paraphrases[0].score);
      } else {
        // If no paraphrases were found, set a low similarity score
        setSimilarity(0.1);
      }
      
    } catch (err) {
      console.error('Error calculating similarity:', err);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Layout>
      <h1>Semantic Textual Similarity</h1>
      
      <form onSubmit={handleSubmit}>
        <div>
          <textarea
            value={text1}
            onChange={(e) => setText1(e.target.value)}
            placeholder="Enter the first text"
          />
          
          <textarea
            value={text2}
            onChange={(e) => setText2(e.target.value)}
            placeholder="Enter the second text"
          />
        </div>
        
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Calculating Similarity...' : 'Calculate Similarity'}
        </button>
      </form>
      
      {similarity !== null && (
        <div>
          <h2>Similarity Result</h2>
          <div>{Math.round(similarity * 100)}%</div>
        </div>
      )}
    </Layout>
  );
}
```

## Performance Optimizations

Several optimizations have been implemented to ensure good performance:

1. **Batch Processing**: Text pairs are processed in batches to avoid memory issues
2. **Selective Reranking**: Reranking is only applied to the top results from the initial search
3. **Caching**: The Cross-Encoder model is loaded once and reused for subsequent requests
4. **Threshold Filtering**: Paraphrase mining uses a threshold to limit the number of results
5. **Pagination**: Search results are paginated to limit the number of items that need to be reranked

These optimizations ensure that the AI-powered search features remain responsive even with large document collections.

---

This technical implementation provides a robust foundation for AI-enhanced search capabilities, with a focus on modularity, performance, and user experience.
