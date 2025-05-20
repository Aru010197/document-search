/**
 * OpenAI-Enhanced Text Processing
 * 
 * This module provides advanced text processing capabilities using OpenAI's
 * language models to enhance the standard NLP pipeline.
 */

import OpenAI from 'openai';

// Initialize the OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Process text using OpenAI's advanced language understanding
 * 
 * @param {string} text - Text to process
 * @param {Object} options - Processing options
 * @returns {Promise<Object>} Enhanced analysis results
 */
export async function enhanceTextProcessing(text, options = {}) {
  if (!text) return {};
  
  try {
    // Truncate text if it's too long
    const truncatedText = truncateText(text, 4000);
    
    // Determine which enhancements to perform
    const enhancementTypes = options.enhancementTypes || ['entities', 'topics', 'sentiment', 'keywords'];
    
    // Create a comprehensive prompt based on requested enhancements
    const prompt = createEnhancementPrompt(truncatedText, enhancementTypes);
    
    // Call OpenAI API
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a text analysis assistant that extracts structured information from documents.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: { type: 'json_object' }
    });
    
    // Parse the response
    const content = response.choices[0].message.content;
    const analysis = JSON.parse(content);
    
    return analysis;
  } catch (error) {
    console.error('Error enhancing text processing with OpenAI:', error);
    return {};
  }
}

/**
 * Enhance chunking using OpenAI's semantic understanding
 * 
 * @param {string} text - Text to chunk
 * @param {Object} options - Chunking options
 * @returns {Promise<Array<Object>>} Enhanced chunks
 */
export async function enhanceChunking(text, options = {}) {
  if (!text) return [];
  
  try {
    // Truncate text if it's too long
    const truncatedText = truncateText(text, 8000);
    
    // Default options
    const chunkSize = options.chunkSize || 1000;
    const chunkCount = options.chunkCount || Math.ceil(truncatedText.length / chunkSize);
    
    // Create prompt for semantic chunking
    const prompt = `
      Divide the following text into ${chunkCount} semantic chunks. Each chunk should be a coherent unit of information.
      Try to break at natural boundaries like topic changes or section breaks.
      
      For each chunk, provide:
      1. The chunk text
      2. A brief title or summary (max 10 words)
      3. The main topics covered
      
      Return the result as a JSON array of objects with "text", "title", and "topics" properties.
      
      TEXT TO CHUNK:
      ${truncatedText}
    `;
    
    // Call OpenAI API
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo-16k',
      messages: [
        {
          role: 'system',
          content: 'You are a document processing assistant that divides text into meaningful semantic chunks.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: { type: 'json_object' }
    });
    
    // Parse the response
    const content = response.choices[0].message.content;
    const result = JSON.parse(content);
    
    // Process the chunks
    const chunks = (result.chunks || []).map((chunk, index) => ({
      text: chunk.text,
      title: chunk.title,
      topics: chunk.topics,
      index,
      start: text.indexOf(chunk.text.substring(0, 50)),
      end: text.indexOf(chunk.text.substring(0, 50)) + chunk.text.length,
      metadata: {
        title: chunk.title,
        topics: chunk.topics
      }
    }));
    
    return chunks;
  } catch (error) {
    console.error('Error enhancing chunking with OpenAI:', error);
    
    // Fall back to basic chunking
    return [];
  }
}

/**
 * Create a prompt for text enhancement based on requested enhancement types
 * 
 * @param {string} text - Text to analyze
 * @param {string[]} enhancementTypes - Types of enhancements to perform
 * @returns {string} Prompt for OpenAI
 */
function createEnhancementPrompt(text, enhancementTypes) {
  let prompt = `Analyze the following text and provide a structured analysis in JSON format.\n\n`;
  
  // Add specific instructions based on enhancement types
  if (enhancementTypes.includes('entities')) {
    prompt += `- Extract named entities (people, organizations, locations, dates, etc.) with their types and relevance scores.\n`;
  }
  
  if (enhancementTypes.includes('topics')) {
    prompt += `- Identify the main topics or themes with confidence scores.\n`;
  }
  
  if (enhancementTypes.includes('sentiment')) {
    prompt += `- Analyze the overall sentiment with a score from -1 (very negative) to 1 (very positive).\n`;
  }
  
  if (enhancementTypes.includes('keywords')) {
    prompt += `- Extract the most important keywords or key phrases.\n`;
  }
  
  prompt += `\nReturn the result as a JSON object with the following structure:
  {
    "entities": [{"text": "string", "type": "string", "relevance": number}],
    "topics": [{"name": "string", "confidence": number}],
    "sentiment": {"score": number, "label": "string"},
    "keywords": ["string"]
  }
  
  TEXT TO ANALYZE:
  ${text}`;
  
  return prompt;
}

/**
 * Truncate text to a maximum number of characters
 * 
 * @param {string} text - Text to truncate
 * @param {number} maxChars - Maximum number of characters
 * @returns {string} - Truncated text
 */
function truncateText(text, maxChars = 4000) {
  if (!text) return '';
  return text.length > maxChars ? text.substring(0, maxChars) : text;
}
