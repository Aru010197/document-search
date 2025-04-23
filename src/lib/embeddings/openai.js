import OpenAI from 'openai';
import { 
  OPENAI_EMBEDDING_MODEL,
  MAX_EMBEDDING_TEXT_LENGTH
} from '../../config/embeddings';

// Initialize the OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Generate embeddings for text using OpenAI's embeddings API
 * 
 * @param {string} text - The text to generate embeddings for
 * @returns {Promise<number[]>} - The embedding vector
 */
export async function generateEmbedding(text) {
  try {
    // Truncate text if it's too long (OpenAI has token limits)
    const truncatedText = truncateText(text, MAX_EMBEDDING_TEXT_LENGTH.openai);
    
    const response = await openai.embeddings.create({
      model: OPENAI_EMBEDDING_MODEL,
      input: truncatedText,
    });
    
    // Return the embedding vector
    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating OpenAI embedding:', error);
    throw new Error(`Failed to generate embedding: ${error.message}`);
  }
}

/**
 * Generate embeddings for multiple texts in batch
 * 
 * @param {string[]} texts - Array of texts to generate embeddings for
 * @returns {Promise<number[][]>} - Array of embedding vectors
 */
export async function generateEmbeddingsBatch(texts) {
  try {
    // Process in batches of 20 (OpenAI recommendation)
    const batchSize = 20;
    const embeddings = [];
    
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize)
        .map(text => truncateText(text, MAX_EMBEDDING_TEXT_LENGTH.openai));
      
      const response = await openai.embeddings.create({
        model: OPENAI_EMBEDDING_MODEL,
        input: batch,
      });
      
      // Add embeddings from this batch
      const batchEmbeddings = response.data.map(item => item.embedding);
      embeddings.push(...batchEmbeddings);
    }
    
    return embeddings;
  } catch (error) {
    console.error('Error generating OpenAI embeddings batch:', error);
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
 * Truncate text to a maximum number of characters
 * 
 * @param {string} text - Text to truncate
 * @param {number} maxChars - Maximum number of characters
 * @returns {string} - Truncated text
 */
function truncateText(text, maxChars = MAX_EMBEDDING_TEXT_LENGTH.openai) {
  if (!text) return '';
  return text.length > maxChars ? text.substring(0, maxChars) : text;
}
