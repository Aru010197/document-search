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
};

/**
 * Default embedding provider
 * 
 * Options:
 * - 'openai': Uses OpenAI's text-embedding-ada-002 model (requires API key)
 * - 'sbert': Uses Sentence Transformers (SBERT) locally (no API key required)
 */
export const DEFAULT_EMBEDDING_PROVIDER = process.env.NEXT_PUBLIC_EMBEDDING_PROVIDER || EMBEDDING_PROVIDERS.OPENAI;

/**
 * OpenAI embedding model
 */
export const OPENAI_EMBEDDING_MODEL = 'text-embedding-ada-002';

/**
 * Embedding dimensions
 * 
 * This should match the dimensions of the embedding model being used:
 * - OpenAI text-embedding-ada-002: 1536 dimensions
 * - Universal Sentence Encoder: 512 dimensions
 */
export const EMBEDDING_DIMENSIONS = {
  [EMBEDDING_PROVIDERS.OPENAI]: 1536,
  [EMBEDDING_PROVIDERS.SBERT]: 512,
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
 */
export const MAX_EMBEDDING_TEXT_LENGTH = {
  [EMBEDDING_PROVIDERS.OPENAI]: 8000,
  [EMBEDDING_PROVIDERS.SBERT]: 10000,
};
