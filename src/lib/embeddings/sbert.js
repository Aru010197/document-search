import * as tf from '@tensorflow/tfjs';
import * as use from '@tensorflow-models/universal-sentence-encoder';
import { 
  MAX_EMBEDDING_TEXT_LENGTH
} from '../../config/embeddings';

// Initialize the Universal Sentence Encoder model
let model;
let modelInitialized = false;

/**
 * Initialize the Universal Sentence Encoder model
 * 
 * @returns {Promise<void>}
 */
async function initializeModel() {
  if (!modelInitialized) {
    try {
      // Load TensorFlow.js Universal Sentence Encoder model
      model = await use.load();
      modelInitialized = true;
      console.log('Universal Sentence Encoder model initialized successfully');
    } catch (error) {
      console.error('Error initializing Universal Sentence Encoder model:', error);
      throw new Error(`Failed to initialize Universal Sentence Encoder model: ${error.message}`);
    }
  }
}

/**
 * Generate embeddings for text using Universal Sentence Encoder
 * 
 * @param {string} text - The text to generate embeddings for
 * @returns {Promise<number[]>} - The embedding vector
 */
export async function generateEmbedding(text) {
  try {
    // Initialize model if not already done
    if (!modelInitialized) {
      await initializeModel();
    }
    
    // Truncate text if it's too long
    const truncatedText = truncateText(text, MAX_EMBEDDING_TEXT_LENGTH.sbert);
    
    // Generate embedding
    const embeddings = await model.embed([truncatedText]);
    
    // Convert to array
    const embedding = Array.from(await embeddings.array())[0];
    
    // Pad the embedding to 1536 dimensions
    return padEmbeddingTo1536Dimensions(embedding);
  } catch (error) {
    console.error('Error generating Universal Sentence Encoder embedding:', error);
    throw new Error(`Failed to generate embedding: ${error.message}`);
  }
}

/**
 * Pad an embedding vector to 1536 dimensions
 * 
 * @param {number[]} embedding - The original embedding vector
 * @returns {number[]} - The padded embedding vector with 1536 dimensions
 */
function padEmbeddingTo1536Dimensions(embedding) {
  // If the embedding is already 1536 dimensions, return it as is
  if (embedding.length === 1536) {
    return embedding;
  }
  
  // If the embedding is longer than 1536, truncate it
  if (embedding.length > 1536) {
    return embedding.slice(0, 1536);
  }
  
  // If the embedding is shorter than 1536, pad it with zeros
  const processedEmbedding = new Array(1536).fill(0);
  
  // Copy the original embedding values
  for (let i = 0; i < embedding.length; i++) {
    processedEmbedding[i] = embedding[i];
  }
  
  return processedEmbedding;
}

/**
 * Generate embeddings for multiple texts in batch
 * 
 * @param {string[]} texts - Array of texts to generate embeddings for
 * @returns {Promise<number[][]>} - Array of embedding vectors
 */
export async function generateEmbeddingsBatch(texts) {
  try {
    // Initialize model if not already done
    if (!modelInitialized) {
      await initializeModel();
    }
    
    // Truncate texts if they're too long
    const truncatedTexts = texts.map(text => truncateText(text, MAX_EMBEDDING_TEXT_LENGTH.sbert));
    
    // Generate embeddings
    const embeddings = await model.embed(truncatedTexts);
    
    // Convert to array
    const embeddingsArray = Array.from(await embeddings.array());
    
    // Pad each embedding to 1536 dimensions
    return embeddingsArray.map(embedding => padEmbeddingTo1536Dimensions(embedding));
  } catch (error) {
    console.error('Error generating Universal Sentence Encoder embeddings batch:', error);
    throw new Error(`Failed to generate embeddings batch: ${error.message}`);
  }
}

/**
 * Generate embeddings for document chunks
 * 
 * @param {Array<Object>} chunks - Array of document chunks with content
 * @returns {Promise<Array<Object>>} - Chunks with embeddings added
 */
export async function generateChunkEmbeddings(chunks) {
  try {
    // Extract text content from chunks
    const texts = chunks.map(chunk => chunk.content);
    
    // Generate embeddings for all texts
    const embeddings = await generateEmbeddingsBatch(texts);
    
    // Add embeddings to chunks
    return chunks.map((chunk, index) => ({
      ...chunk,
      embedding: embeddings[index],
    }));
  } catch (error) {
    console.error('Error generating chunk embeddings:', error);
    throw new Error(`Failed to generate chunk embeddings: ${error.message}`);
  }
}

/**
 * Calculate similarity between two texts
 * 
 * @param {string} text1 - First text
 * @param {string} text2 - Second text
 * @returns {Promise<number>} - Similarity score (0-1)
 */
export async function calculateSimilarity(text1, text2) {
  try {
    // Initialize model if not already done
    if (!modelInitialized) {
      await initializeModel();
    }
    
    // Generate embeddings
    const embedding1 = await generateEmbedding(text1);
    const embedding2 = await generateEmbedding(text2);
    
    // Calculate cosine similarity
    return calculateCosineSimilarity(embedding1, embedding2);
  } catch (error) {
    console.error('Error calculating similarity:', error);
    throw new Error(`Failed to calculate similarity: ${error.message}`);
  }
}

/**
 * Calculate cosine similarity between two vectors
 * 
 * @param {number[]} vec1 - First vector
 * @param {number[]} vec2 - Second vector
 * @returns {number} - Similarity score (0-1)
 */
function calculateCosineSimilarity(vec1, vec2) {
  // Calculate dot product
  const dotProduct = vec1.reduce((sum, val, i) => sum + val * vec2[i], 0);
  
  // Calculate magnitudes
  const mag1 = Math.sqrt(vec1.reduce((sum, val) => sum + val * val, 0));
  const mag2 = Math.sqrt(vec2.reduce((sum, val) => sum + val * val, 0));
  
  // Calculate cosine similarity
  return dotProduct / (mag1 * mag2);
}

/**
 * Truncate text to a maximum number of characters
 * 
 * @param {string} text - Text to truncate
 * @param {number} maxChars - Maximum number of characters
 * @returns {string} - Truncated text
 */
function truncateText(text, maxChars = MAX_EMBEDDING_TEXT_LENGTH.sbert) {
  if (!text) return '';
  return text.length > maxChars ? text.substring(0, maxChars) : text;
}
