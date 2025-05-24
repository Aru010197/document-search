/**
 * Embeddings module
 * 
 * This module provides a unified interface for generating embeddings
 * using different models (OpenAI or SBERT).
 */

import * as openai from './openai';
import { 
  DEFAULT_EMBEDDING_PROVIDER, 
  EMBEDDING_PROVIDERS 
} from '../../config/embeddings';

/**
 * Generate embeddings for text using the specified provider
 * 
 * @param {string} text - The text to generate embeddings for
 * @param {string} provider - The embedding provider ('openai' or 'sbert')
 * @returns {Promise<number[]>} - The embedding vector
 */
export async function generateEmbedding(text, provider = DEFAULT_EMBEDDING_PROVIDER) {
  if (provider === EMBEDDING_PROVIDERS.SBERT) {
    const sbert = await import('./sbert');
    return sbert.generateEmbedding(text);
  } else {
    return openai.generateEmbedding(text);
  }
}

/**
 * Generate embeddings for multiple texts in batch
 * 
 * @param {string[]} texts - Array of texts to generate embeddings for
 * @param {string} provider - The embedding provider ('openai' or 'sbert')
 * @returns {Promise<number[][]>} - Array of embedding vectors
 */
export async function generateEmbeddingsBatch(texts, provider = DEFAULT_EMBEDDING_PROVIDER) {
  if (provider === EMBEDDING_PROVIDERS.SBERT) {
    const sbert = await import('./sbert');
    return sbert.generateEmbeddingsBatch(texts);
  } else {
    return openai.generateEmbeddingsBatch(texts);
  }
}

/**
 * Generate embeddings for document chunks
 * 
 * @param {Array<Object>} chunks - Array of document chunks with content
 * @param {Object} options - Processing options
 * @param {boolean} options.useOpenAI - Whether to use enhanced OpenAI processing
 * @param {string} options.provider - The embedding provider ('openai' or 'sbert')
 * @returns {Promise<Array<Object>>} - Chunks with embeddings added
 */
export async function generateChunkEmbeddings(chunks, options = {}) {
  // Determine provider - if useOpenAI is true, force OpenAI provider
  const providerToUse = options.useOpenAI ? EMBEDDING_PROVIDERS.OPENAI : (options.provider || DEFAULT_EMBEDDING_PROVIDER);
  
  // Use the appropriate provider
  if (providerToUse === EMBEDDING_PROVIDERS.SBERT) {
    const sbert = await import('./sbert');
    return sbert.generateChunkEmbeddings(chunks);
  } else {
    // If enhanced OpenAI processing is requested, use a more advanced model
    const enhancedOptions = options.useOpenAI ? { useAdvancedModel: true } : {};
    return openai.generateChunkEmbeddings(chunks, enhancedOptions);
  }
}

/**
 * Calculate similarity between two texts
 * 
 * @param {string} text1 - First text
 * @param {string} text2 - Second text
 * @param {string} provider - The embedding provider ('openai' or 'sbert')
 * @returns {Promise<number>} - Similarity score (0-1)
 */
export async function calculateSimilarity(text1, text2, provider = DEFAULT_EMBEDDING_PROVIDER) {
  if (provider === EMBEDDING_PROVIDERS.SBERT) {
    const sbert = await import('./sbert');
    return sbert.calculateSimilarity(text1, text2);
  } else {
    // For OpenAI, we need to generate embeddings and calculate similarity manually
    const embedding1 = await openai.generateEmbedding(text1);
    const embedding2 = await openai.generateEmbedding(text2);
    
    // Calculate cosine similarity
    return cosineSimilarity(embedding1, embedding2);
  }
}

/**
 * Calculate cosine similarity between two vectors
 * 
 * @param {number[]} vec1 - First vector
 * @param {number[]} vec2 - Second vector
 * @returns {number} - Similarity score (0-1)
 */
export function cosineSimilarity(vec1, vec2) {
  // Calculate dot product
  const dotProduct = vec1.reduce((sum, val, i) => sum + val * vec2[i], 0);
  
  // Calculate magnitudes
  const mag1 = Math.sqrt(vec1.reduce((sum, val) => sum + val * val, 0));
  const mag2 = Math.sqrt(vec2.reduce((sum, val) => sum + val * val, 0));
  
  // Calculate cosine similarity
  return dotProduct / (mag1 * mag2);
}
