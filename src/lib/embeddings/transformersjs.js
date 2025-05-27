\
import { pipeline, env } from '@xenova/transformers';

// Configure transformers.js
// Prevent local model checking for faster initialization in serverless,
// unless you specifically bundle models.
// env.allowLocalModels = false; 
// Set a specific cache directory if needed, e.g., /tmp for serverless environments
// env.cacheDir = '/tmp/transformers_cache'; 

const MODEL_NAME = 'Xenova/all-MiniLM-L6-v2';
let extractor = null;

/**
 * Initialize the feature-extraction pipeline
 * This is called on the first embedding generation.
 */
async function initializeModel() {
  if (!extractor) {
    try {
      console.log(`Initializing feature-extraction pipeline with model: ${MODEL_NAME}`);
      // For serverless, consider downloading the model during build and loading locally if cold starts are an issue.
      // For now, we'll let it download on first use.
      extractor = await pipeline('feature-extraction', MODEL_NAME);
      console.log('Feature-extraction pipeline initialized successfully.');
    } catch (error) {
      console.error('Error initializing feature-extraction pipeline:', error);
      throw new Error(`Failed to initialize embedding model: ${error.message}`);
    }
  }
}

/**
 * Generate embeddings for a single text.
 * @param {string} text - The text to generate embeddings for.
 * @returns {Promise<number[]>} - The embedding vector.
 */
export async function generateEmbedding(text) {
  if (!extractor) {
    await initializeModel();
  }
  if (!text || typeof text !== 'string' || text.trim() === '') {
    // Return a zero vector or handle as an error, consistent with other providers
    console.warn('generateEmbedding called with empty or invalid text.');
    // Assuming embedding dimension of all-MiniLM-L6-v2 is 384
    return Array(384).fill(0); 
  }
  try {
    const output = await extractor(text, { pooling: 'mean', normalize: true });
    return Array.from(output.data);
  } catch (error) {
    console.error('Error generating embedding with transformers.js:', error);
    throw new Error(`Failed to generate embedding: ${error.message}`);
  }
}

/**
 * Generate embeddings for multiple texts in batch.
 * @param {string[]} texts - Array of texts to generate embeddings for.
 * @returns {Promise<number[][]>} - Array of embedding vectors.
 */
export async function generateEmbeddingsBatch(texts) {
  if (!extractor) {
    await initializeModel();
  }
  if (!texts || !Array.isArray(texts) || texts.length === 0) {
    return [];
  }
  // Transformers.js pipeline can process an array of texts directly.
  try {
    const outputs = await extractor(texts, { pooling: 'mean', normalize: true });
    // For a batch, 'outputs' will be a single tensor if inputs are batched correctly by the pipeline.
    // If it returns an array of tensors, adjust accordingly.
    // For now, assuming it processes them and returns a single tensor where each row is an embedding.
    // This needs verification based on how the specific pipeline handles batch inputs.
    // The typical output for a batch is a tensor of shape [batch_size, embedding_dim].
    
    // If `extractor` processes texts one by one even if an array is passed,
    // we might need to loop. However, HF pipelines usually batch them.
    // Let's assume it returns a single tensor for now.
    // If `outputs.dims[0]` is batch size and `outputs.dims[1]` is embedding_dim:
    const embeddings = [];
    for (let i = 0; i < outputs.dims[0]; ++i) {
        embeddings.push(Array.from(outputs.data.slice(i * outputs.dims[1], (i + 1) * outputs.dims[1])));
    }
    return embeddings;

    // Fallback if the above batch processing assumption is wrong:
    // return Promise.all(texts.map(text => generateEmbedding(text)));
  } catch (error) {
    console.error('Error generating embeddings batch with transformers.js:', error);
    throw new Error(`Failed to generate embeddings batch: ${error.message}`);
  }
}

/**
 * Generate embeddings for document chunks.
 * @param {Array<Object>} chunks - Array of document chunks with content.
 * @param {Object} options - Processing options (currently not used).
 * @returns {Promise<Array<Object>>} - Chunks with embeddings added.
 */
export async function generateChunkEmbeddings(chunks, options = {}) {
  if (!chunks || chunks.length === 0) {
    return [];
  }
  const texts = chunks.map(chunk => chunk.content);
  const embeddings = await generateEmbeddingsBatch(texts);
  return chunks.map((chunk, index) => ({
    ...chunk,
    embedding: embeddings[index],
  }));
}

function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) {
    return 0;
  }
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) {
    return 0;
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Calculate similarity between two texts.
 * @param {string} text1 - First text.
 * @param {string} text2 - Second text.
 * @returns {Promise<number>} - Similarity score (0-1).
 */
export async function calculateSimilarity(text1, text2) {
  const embedding1 = await generateEmbedding(text1);
  const embedding2 = await generateEmbedding(text2);
  return cosineSimilarity(embedding1, embedding2);
}

// Optional: Add a function to get embedding dimensions if needed elsewhere
export function getEmbeddingDimension() {
  // Dimension for Xenova/all-MiniLM-L6-v2 is 384
  return 384; 
}
