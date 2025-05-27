/**
 * Embeddings module
 * 
 * This module provides a unified interface for generating embeddings
 * using SBERT (Sentence Transformers).
 */

import * as sbert from './sbert';
import { EMBEDDING_PROVIDERS, DEFAULT_EMBEDDING_PROVIDER } from '../../config/embeddings'; // Keep for context, though DEFAULT_EMBEDDING_PROVIDER is now SBERT

// Ensure that the configuration is indeed SBERT, otherwise log a warning.
if (DEFAULT_EMBEDDING_PROVIDER !== EMBEDDING_PROVIDERS.SBERT) {
  console.warn("Warning: DEFAULT_EMBEDDING_PROVIDER is not SBERT, but embeddings/index.js is configured to only use SBERT.");
}

/**
 * Generate embeddings for text using SBERT
 * 
 * @param {string} text - The text to generate embeddings for
 * @returns {Promise<number[]>} - The embedding vector
 */
export async function generateEmbedding(text) {
  return sbert.generateEmbedding(text);
}

/**
 * Generate embeddings for multiple texts in batch using SBERT
 * 
 * @param {string[]} texts - Array of texts to generate embeddings for
 * @returns {Promise<number[][]>} - Array of embedding vectors
 */
export async function generateEmbeddingsBatch(texts) {
  return sbert.generateEmbeddingsBatch(texts);
}

/**
 * Generate embeddings for document chunks using SBERT
 * 
 * @param {Array<Object>} chunks - Array of document chunks with content
 * @param {Object} options - Processing options (currently not used by SBERT module)
 * @returns {Promise<Array<Object>>} - Chunks with embeddings added
 */
export async function generateChunkEmbeddings(chunks, options = {}) {
  // options are passed through in case sbert.generateChunkEmbeddings might use them in the future
  return sbert.generateChunkEmbeddings(chunks, options);
}

/**
 * Calculate similarity between two texts using SBERT
 * 
 * @param {string} text1 - First text
 * @param {string} text2 - Second text
 * @returns {Promise<number>} - Similarity score (0-1)
 */
export async function calculateSimilarity(text1, text2) {
  return sbert.calculateSimilarity(text1, text2);
}

// The cosineSimilarity function previously here was for the OpenAI path.
// SBERT's calculateSimilarity uses its own internal cosineSimilarity.
// If cosineSimilarity is needed elsewhere, it should be a shared utility.
