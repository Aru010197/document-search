/**
 * Embeddings Configuration
 * 
 * This file contains configuration options for the embeddings functionality.
 * You can customize the embedding provider and other settings here.
 */

/**
 * Available embedding providers
 */
export const EMBEDDING_PROVIDERS = {
  OPENAI: 'openai',
  SBERT: 'sbert',
  TRANSFORMERSJS: 'transformersjs',
};

/**
 * Default embedding provider
 * 
 * Options:
 * - 'openai': Uses OpenAI's text-embedding-ada-002 model (requires API key)
 * - 'sbert': Uses Sentence Transformers (SBERT) locally (no API key required)
 * - 'transformersjs': Uses a lightweight ONNX model via transformers.js
 */
export const DEFAULT_EMBEDDING_PROVIDER = EMBEDDING_PROVIDERS.TRANSFORMERSJS;

/**
 * OpenAI embedding model
 */
export const OPENAI_EMBEDDING_MODEL = 'text-embedding-3-small';

/**
 * Embedding dimensions
 * 
 * This should match the dimensions of the embedding model being used:
 * - OpenAI text-embedding-ada-002 / text-embedding-3-small: 1536 dimensions
 * - Universal Sentence Encoder (SBERT default): 512 dimensions
 * - Xenova/all-MiniLM-L6-v2 (transformers.js default): 384 dimensions
 */
export const EMBEDDING_DIMENSIONS = {
  [EMBEDDING_PROVIDERS.OPENAI]: 1536,
  [EMBEDDING_PROVIDERS.SBERT]: 512, // This was the previous SBERT (USE) dimension
  [EMBEDDING_PROVIDERS.TRANSFORMERSJS]: 384,
};

/**
 * Similarity threshold for vector search
 * 
 * Higher values (closer to 1.0) require more similar matches
 * Lower values (closer to 0.0) allow more diverse results
 */
export const SIMILARITY_THRESHOLD = 0.5;

/**
 * Maximum text length for embedding generation
 * 
 * Different models have different token limits:
 * - OpenAI text-embedding-ada-002: ~8000 tokens
 * - Universal Sentence Encoder: No hard limit, but performance degrades with very long texts
 * - transformers.js models: Varies by model, but generally handle typical sentence/paragraph lengths well.
 */
export const MAX_EMBEDDING_TEXT_LENGTH = {
  [EMBEDDING_PROVIDERS.OPENAI]: 8000,
  [EMBEDDING_PROVIDERS.SBERT]: 10000, // Kept for SBERT if ever switched back
  [EMBEDDING_PROVIDERS.TRANSFORMERSJS]: 512, // Based on typical max sequence length for MiniLM models (can be adjusted)
};
