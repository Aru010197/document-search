/**
 * Text Processing Pipeline
 * 
 * A comprehensive text processing system for document analysis and search.
 * This module handles the entire pipeline from raw text extraction to 
 * search-ready indexed content.
 */

// Import OpenAI enhanced processing (if available)
let openaiProcessor;
try {
  openaiProcessor = require('./openai-processor');
} catch (e) {
  console.log('OpenAI processor not available, will use standard processing only');
  openaiProcessor = null;
}

// Import natural language processing libraries
const natural = require('natural');
const { WordTokenizer, SentenceTokenizer } = natural;
const { PorterStemmer, LancasterStemmer } = natural;
const { TfIdf } = natural;
const { WordNet } = natural;

// Import entity recognition (if available)
let ner;
try {
  const { NER } = require('node-ner');
  ner = new NER({ builtins: ['PERSON', 'ORGANIZATION', 'LOCATION'] });
} catch (e) {
  console.log('NER module not available, entity recognition will be skipped');
  ner = null;
}

// Initialize tokenizers
const wordTokenizer = new WordTokenizer();
const sentenceTokenizer = new SentenceTokenizer();

// Initialize WordNet for lemmatization (if available)
let wordnet;
try {
  wordnet = new WordNet();
} catch (e) {
  console.log('WordNet not available, lemmatization will fall back to stemming');
  wordnet = null;
}

/**
 * Complete text processing pipeline
 * 
 * @param {string} text - Raw text to process
 * @param {Object} options - Processing options
 * @param {boolean} options.useOpenAI - Whether to use enhanced OpenAI processing
 * @returns {Object} Processed text with metadata and analysis
 */
async function processText(text, options = {}) {
  // Default options
  const defaultOptions = {
    cleanText: true,
    tokenize: true,
    normalize: true,
    useStemming: true,
    useLemmatization: true,
    performPOSTagging: true,
    performNER: true,
    performSentimentAnalysis: true,
    chunkSize: 1000,
    chunkOverlap: 200,
    generateEmbeddings: true,
    generateKeywordIndex: true
  };
  
  const opts = { ...defaultOptions, ...options };
  
  // Initialize result object
  const result = {
    original: text,
    processed: text,
    metadata: {
      charCount: text.length,
      wordCount: 0,
      sentenceCount: 0,
      paragraphCount: 0
    },
    analysis: {},
    chunks: [],
    index: {}
  };
  
  // Step 1: Text Cleaning
  if (opts.cleanText) {
    result.processed = cleanText(result.processed);
  }
  
  // Step 2: Tokenization
  if (opts.tokenize) {
    const tokenization = tokenizeText(result.processed);
    result.tokens = tokenization.tokens;
    result.sentences = tokenization.sentences;
    result.paragraphs = tokenization.paragraphs;
    
    // Update metadata
    result.metadata.wordCount = result.tokens.length;
    result.metadata.sentenceCount = result.sentences.length;
    result.metadata.paragraphCount = result.paragraphs.length;
  }
  
  // Step 3: Normalization
  if (opts.normalize) {
    if (opts.useLemmatization && wordnet) {
      result.normalizedTokens = await lemmatizeTokens(result.tokens);
    } else if (opts.useStemming) {
      result.normalizedTokens = stemTokens(result.tokens);
    } else {
      result.normalizedTokens = result.tokens.map(token => token.toLowerCase());
    }
  }
  
  // Step 4: Linguistic Analysis
  const analysis = {};
  
  // Part-of-speech tagging
  if (opts.performPOSTagging) {
    analysis.pos = performPOSTagging(result.tokens);
  }
  
  // Named Entity Recognition
  if (opts.performNER && ner) {
    analysis.entities = await performEntityRecognition(result.processed);
  }
  
  // Sentiment Analysis
  if (opts.performSentimentAnalysis) {
    analysis.sentiment = performSentimentAnalysis(result.processed);
  }
  
  result.analysis = analysis;
  
  // Step 5: Chunking
  if (opts.useOpenAI && openaiProcessor) {
    // Use OpenAI for enhanced semantic chunking
    try {
      const enhancedChunks = await openaiProcessor.enhanceChunking(result.processed, {
        chunkSize: opts.chunkSize,
        chunkOverlap: opts.chunkOverlap
      });
      
      if (enhancedChunks && enhancedChunks.length > 0) {
        result.chunks = enhancedChunks;
        console.log('Using OpenAI enhanced chunking');
      } else {
        // Fall back to standard chunking
        result.chunks = chunkText(result.processed, result.sentences, opts.chunkSize, opts.chunkOverlap);
      }
    } catch (error) {
      console.error('Error using OpenAI enhanced chunking:', error);
      // Fall back to standard chunking
      result.chunks = chunkText(result.processed, result.sentences, opts.chunkSize, opts.chunkOverlap);
    }
  } else {
    // Use standard chunking
    result.chunks = chunkText(result.processed, result.sentences, opts.chunkSize, opts.chunkOverlap);
  }
  
  // Step 6: Indexing
  if (opts.generateKeywordIndex) {
    result.index = generateKeywordIndex(result.chunks, result.normalizedTokens);
  }
  
  // Step 7: Enhanced analysis with OpenAI (if enabled)
  if (opts.useOpenAI && openaiProcessor) {
    try {
      const enhancedAnalysis = await openaiProcessor.enhanceTextProcessing(result.processed, {
        enhancementTypes: ['entities', 'topics', 'sentiment', 'keywords']
      });
      
      if (enhancedAnalysis) {
        // Merge enhanced analysis with existing analysis
        result.analysis = {
          ...result.analysis,
          openai: enhancedAnalysis
        };
        
        // Add enhanced keywords if available
        if (enhancedAnalysis.keywords && enhancedAnalysis.keywords.length > 0) {
          result.enhancedKeywords = enhancedAnalysis.keywords;
        }
        
        console.log('Using OpenAI enhanced text processing');
      }
    } catch (error) {
      console.error('Error using OpenAI enhanced text processing:', error);
    }
  }
  
  return result;
}

/**
 * Clean text by removing control characters, normalizing whitespace, and handling special characters
 * 
 * @param {string} text - Text to clean
 * @returns {string} Cleaned text
 */
function cleanText(text) {
  if (!text) return '';
  
  // Remove control characters
  let cleaned = text.replace(/[\x00-\x09\x0B\x0C\x0E-\x1F\x7F]/g, '');
  
  // Normalize whitespace (replace multiple spaces, tabs, etc. with a single space)
  cleaned = cleaned.replace(/\s+/g, ' ');
  
  // Replace non-breaking spaces with regular spaces
  cleaned = cleaned.replace(/\u00A0/g, ' ');
  
  // Handle special characters (smart quotes, em dashes, etc.)
  cleaned = cleaned
    .replace(/[\u2018\u2019]/g, "'") // Smart single quotes
    .replace(/[\u201C\u201D]/g, '"') // Smart double quotes
    .replace(/\u2014/g, '--') // Em dash
    .replace(/\u2013/g, '-') // En dash
    .replace(/\u2026/g, '...') // Ellipsis
    
  // Trim leading and trailing whitespace
  cleaned = cleaned.trim();
  
  return cleaned;
}

/**
 * Tokenize text into words, sentences, and paragraphs
 * 
 * @param {string} text - Text to tokenize
 * @returns {Object} Object containing tokens, sentences, and paragraphs
 */
function tokenizeText(text) {
  if (!text) return { tokens: [], sentences: [], paragraphs: [] };
  
  // Split into paragraphs (by double newlines)
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
  
  // Split into sentences
  const sentences = sentenceTokenizer.tokenize(text);
  
  // Split into words/tokens
  const tokens = wordTokenizer.tokenize(text);
  
  return {
    tokens,
    sentences,
    paragraphs
  };
}

/**
 * Apply stemming to tokens
 * 
 * @param {string[]} tokens - Array of tokens to stem
 * @returns {string[]} Array of stemmed tokens
 */
function stemTokens(tokens) {
  if (!tokens || !Array.isArray(tokens)) return [];
  
  // Use Porter stemmer (more conservative than Lancaster)
  return tokens.map(token => PorterStemmer.stem(token.toLowerCase()));
}

/**
 * Apply lemmatization to tokens
 * 
 * @param {string[]} tokens - Array of tokens to lemmatize
 * @returns {Promise<string[]>} Promise resolving to array of lemmatized tokens
 */
async function lemmatizeTokens(tokens) {
  if (!tokens || !Array.isArray(tokens) || !wordnet) {
    // Fall back to stemming if WordNet is not available
    return stemTokens(tokens);
  }
  
  const lemmatized = [];
  
  for (const token of tokens) {
    try {
      // Look up the lemma in WordNet
      const lemma = await new Promise((resolve) => {
        wordnet.lookup(token.toLowerCase(), (results) => {
          if (results && results.length > 0 && results[0].lemma) {
            resolve(results[0].lemma);
          } else {
            resolve(token.toLowerCase());
          }
        });
      });
      
      lemmatized.push(lemma);
    } catch (e) {
      // If there's an error, just use the lowercase token
      lemmatized.push(token.toLowerCase());
    }
  }
  
  return lemmatized;
}

/**
 * Perform part-of-speech tagging
 * 
 * @param {string[]} tokens - Array of tokens to tag
 * @returns {Object[]} Array of objects with token and pos properties
 */
function performPOSTagging(tokens) {
  if (!tokens || !Array.isArray(tokens)) return [];
  
  try {
    const { BrillPOSTagger } = natural;
    const lexicon = new natural.Lexicon('EN', 'NN');
    const ruleSet = new natural.RuleSet('EN');
    const tagger = new BrillPOSTagger(lexicon, ruleSet);
    
    const taggedWords = tagger.tag(tokens).taggedWords;
    
    return taggedWords.map(tw => ({
      token: tw.token,
      pos: tw.tag
    }));
  } catch (e) {
    console.error('Error during POS tagging:', e);
    // Return a simple format if tagger fails
    return tokens.map(token => ({
      token,
      pos: 'UNK' // Unknown
    }));
  }
}

/**
 * Perform named entity recognition
 * 
 * @param {string} text - Text to analyze
 * @returns {Promise<Object[]>} Promise resolving to array of recognized entities
 */
async function performEntityRecognition(text) {
  if (!text || !ner) return [];
  
  try {
    const entities = await ner.process(text);
    return entities;
  } catch (e) {
    console.error('Error during entity recognition:', e);
    return [];
  }
}

/**
 * Perform sentiment analysis
 * 
 * @param {string} text - Text to analyze
 * @returns {Object} Sentiment analysis results
 */
function performSentimentAnalysis(text) {
  if (!text) return { score: 0, comparative: 0, positive: [], negative: [] };
  
  try {
    const { SentimentAnalyzer, PorterStemmer } = natural;
    const analyzer = new SentimentAnalyzer('English', PorterStemmer, 'afinn');
    
    // Tokenize for sentiment analysis
    const tokens = wordTokenizer.tokenize(text);
    
    // Get sentiment score
    const score = analyzer.getSentiment(tokens);
    
    // Extract positive and negative words
    const { WordTokenizer, SentimentAnalyzer: SA } = natural;
    const tokenizer = new WordTokenizer();
    const analyzer2 = new SA('English', PorterStemmer, 'afinn');
    
    const words = tokenizer.tokenize(text);
    const positive = [];
    const negative = [];
    
    for (const word of words) {
      const score = analyzer2.getSentiment([word]);
      if (score > 0) positive.push(word);
      if (score < 0) negative.push(word);
    }
    
    return {
      score,
      comparative: score / tokens.length,
      positive,
      negative
    };
  } catch (e) {
    console.error('Error during sentiment analysis:', e);
    return { score: 0, comparative: 0, positive: [], negative: [] };
  }
}

/**
 * Chunk text into semantic units with overlap
 * 
 * @param {string} text - Full text to chunk
 * @param {string[]} sentences - Array of sentences
 * @param {number} chunkSize - Target size of each chunk in characters
 * @param {number} overlap - Overlap between chunks in characters
 * @returns {Object[]} Array of chunk objects
 */
function chunkText(text, sentences, chunkSize = 1000, overlap = 200) {
  if (!text || !sentences || !sentences.length) {
    return [{ text, start: 0, end: text.length }];
  }
  
  const chunks = [];
  let currentChunk = '';
  let currentStart = 0;
  let sentenceStart = 0;
  
  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];
    
    // Find the start position of this sentence in the original text
    const sentenceIndex = text.indexOf(sentence, sentenceStart);
    if (sentenceIndex === -1) continue;
    
    // Update sentenceStart for the next iteration
    sentenceStart = sentenceIndex + sentence.length;
    
    // If adding this sentence would exceed the chunk size
    if (currentChunk.length + sentence.length > chunkSize && currentChunk.length > 0) {
      // Save the current chunk
      chunks.push({
        text: currentChunk,
        start: currentStart,
        end: sentenceStart - sentence.length
      });
      
      // Start a new chunk with overlap
      // Find a good starting point for the new chunk
      let overlapStart = Math.max(0, sentenceStart - sentence.length - overlap);
      
      // Try to find a sentence boundary for the overlap
      let overlapSentenceIndex = -1;
      for (let j = i - 1; j >= 0; j--) {
        const prevSentence = sentences[j];
        const prevIndex = text.indexOf(prevSentence, Math.max(0, overlapStart - prevSentence.length * 2));
        
        if (prevIndex >= overlapStart) {
          overlapSentenceIndex = j;
          overlapStart = prevIndex;
          break;
        }
      }
      
      // If we couldn't find a good sentence boundary, just use the character-based overlap
      if (overlapSentenceIndex === -1) {
        currentChunk = text.substring(overlapStart, sentenceStart);
        currentStart = overlapStart;
      } else {
        // Start from the overlap sentence
        currentChunk = '';
        for (let j = overlapSentenceIndex; j <= i; j++) {
          currentChunk += sentences[j] + ' ';
        }
        currentStart = overlapStart;
      }
    } else {
      // Add the sentence to the current chunk
      if (currentChunk.length === 0) {
        currentStart = sentenceIndex;
      }
      currentChunk += sentence + ' ';
    }
  }
  
  // Add the last chunk if there's anything left
  if (currentChunk.length > 0) {
    chunks.push({
      text: currentChunk.trim(),
      start: currentStart,
      end: text.length
    });
  }
  
  // Add metadata to each chunk
  return chunks.map((chunk, index) => ({
    ...chunk,
    index,
    wordCount: wordTokenizer.tokenize(chunk.text).length,
    sentenceCount: sentenceTokenizer.tokenize(chunk.text).length
  }));
}

/**
 * Generate keyword index for chunks
 * 
 * @param {Object[]} chunks - Array of text chunks
 * @param {string[]} normalizedTokens - Array of normalized tokens
 * @returns {Object} Keyword index
 */
function generateKeywordIndex(chunks, normalizedTokens) {
  if (!chunks || !chunks.length || !normalizedTokens || !normalizedTokens.length) {
    return {};
  }
  
  // Create TF-IDF model
  const tfidf = new TfIdf();
  
  // Add each chunk to the model
  chunks.forEach(chunk => {
    tfidf.addDocument(chunk.text);
  });
  
  // Generate index
  const index = {};
  
  // Get unique normalized tokens
  const uniqueTokens = [...new Set(normalizedTokens)];
  
  // For each token, find its TF-IDF score in each document
  uniqueTokens.forEach(token => {
    const tokenScores = [];
    
    tfidf.tfidfs(token, (i, measure) => {
      if (measure > 0) {
        tokenScores.push({
          chunkIndex: i,
          score: measure
        });
      }
    });
    
    // Sort by score (descending)
    tokenScores.sort((a, b) => b.score - a.score);
    
    // Only store if there are scores
    if (tokenScores.length > 0) {
      index[token] = tokenScores;
    }
  });
  
  return index;
}

module.exports = {
  processText,
  cleanText,
  tokenizeText,
  stemTokens,
  lemmatizeTokens,
  performPOSTagging,
  performEntityRecognition,
  performSentimentAnalysis,
  chunkText,
  generateKeywordIndex
};
