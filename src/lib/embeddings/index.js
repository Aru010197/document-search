/**
 * Embeddings module
 * 
 * This module provides a unified interface for generating embeddings
 * using different models (OpenAI, SBERT, or Transformers.js).
 */

import { 
  DEFAULT_EMBEDDING_PROVIDER, 
  EMBEDDING_PROVIDERS 
} from '../../config/embeddings';

/**
 * Generate embeddings for text using the specified provider
 * 
 * @param {string} text - The text to generate embeddings for
 * @param {string} provider - The embedding provider ('openai', 'sbert', or 'transformersjs')
 * @returns {Promise<number[]>} - The embedding vector
 */
export async function generateEmbedding(text, provider = DEFAULT_EMBEDDING_PROVIDER) {
  switch (provider) {
    case EMBEDDING_PROVIDERS.SBERT:
      const sbert = await import('./sbert');
      return sbert.generateEmbedding(text);
    case EMBEDDING_PROVIDERS.TRANSFORMERSJS:
      const transformersjs = await import('./transformersjs');
      return transformersjs.generateEmbedding(text);
    case EMBEDDING_PROVIDERS.OPENAI:
    default:
      const openai = await import('./openai');
      return openai.generateEmbedding(text);
  }
}

/**
 * Generate embeddings for multiple texts in batch
 * 
 * @param {string[]} texts - Array of texts to generate embeddings for
 * @param {string} provider - The embedding provider
 * @returns {Promise<number[][]>} - Array of embedding vectors
 */
export async function generateEmbeddingsBatch(texts, provider = DEFAULT_EMBEDDING_PROVIDER) {
  switch (provider) {
    case EMBEDDING_PROVIDERS.SBERT:
      const sbert = await import('./sbert');
      return sbert.generateEmbeddingsBatch(texts);
    case EMBEDDING_PROVIDERS.TRANSFORMERSJS:
      const transformersjs = await import('./transformersjs');
      return transformersjs.generateEmbeddingsBatch(texts);
    case EMBEDDING_PROVIDERS.OPENAI:
    default:
      const openai = await import('./openai');
      return openai.generateEmbeddingsBatch(texts);
  }
}

/**
 * Generate embeddings for document chunks
 * 
 * @param {Array<Object>} chunks - Array of document chunks with content
 * @param {Object} options - Processing options
 * @param {string} options.provider - The embedding provider
 * @returns {Promise<Array<Object>>} - Chunks with embeddings added
 */
export async function generateChunkEmbeddings(chunks, options = {}) {
  const providerToUse = options.provider || DEFAULT_EMBEDDING_PROVIDER;
  // Special handling for OpenAI enhanced processing if that logic is still relevant
  if (providerToUse === EMBEDDING_PROVIDERS.OPENAI && options.useOpenAI) {
    const openai = await import('./openai');
    const enhancedOptions = options.useOpenAI ? { useAdvancedModel: true } : {};
    return openai.generateChunkEmbeddings(chunks, enhancedOptions);
  }

  switch (providerToUse) {
    case EMBEDDING_PROVIDERS.SBERT:
      const sbert = await import('./sbert');
      return sbert.generateChunkEmbeddings(chunks, options);
    case EMBEDDING_PROVIDERS.TRANSFORMERSJS:
      const transformersjs = await import('./transformersjs');
      return transformersjs.generateChunkEmbeddings(chunks, options);
    case EMBEDDING_PROVIDERS.OPENAI:
    default:
      const openai = await import('./openai');
      return openai.generateChunkEmbeddings(chunks, options);
  }
}

/**
 * Calculate similarity between two texts
 * 
 * @param {string} text1 - First text
 * @param {string} text2 - Second text
 * @param {string} provider - The embedding provider
 * @returns {Promise<number>} - Similarity score (0-1)
 */
export async function calculateSimilarity(text1, text2, provider = DEFAULT_EMBEDDING_PROVIDER) {
  switch (provider) {
    case EMBEDDING_PROVIDERS.SBERT:
      const sbert = await import('./sbert');
      return sbert.calculateSimilarity(text1, text2);
    case EMBEDDING_PROVIDERS.TRANSFORMERSJS:
      const transformersjs = await import('./transformersjs');
      return transformersjs.calculateSimilarity(text1, text2);
    case EMBEDDING_PROVIDERS.OPENAI:
    default:
      // For OpenAI, we need to generate embeddings and calculate similarity manually
      const openai = await import('./openai');
      const embedding1 = await openai.generateEmbedding(text1);
      const embedding2 = await openai.generateEmbedding(text2);
      return cosineSimilarityUtil(embedding1, embedding2); // Use shared utility
  }
}

/**
 * Calculate cosine similarity between two vectors (utility function)
 * 
 * @param {number[]} vec1 - First vector
 * @param {number[]} vec2 - Second vector
 * @returns {number} - Similarity score (0-1)
 */
function cosineSimilarityUtil(vec1, vec2) {
  if (!vec1 || !vec2 || vec1.length !== vec2.length) return 0;
  const dotProduct = vec1.reduce((sum, val, i) => sum + val * vec2[i], 0);
  const mag1 = Math.sqrt(vec1.reduce((sum, val) => sum + val * val, 0));
  const mag2 = Math.sqrt(vec2.reduce((sum, val) => sum + val * val, 0));
  if (mag1 === 0 || mag2 === 0) return 0;
  return dotProduct / (mag1 * mag2);
}
