/**
 * Metadata extraction utilities for different document types.
 * 
 * This module provides functions to extract metadata from various
 * document formats (PDF, DOCX, PPTX, XLSX).
 */

import OpenAI from 'openai';

// Initialize the OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Extract keywords from document content using OpenAI
 * @param {string} text - The document text content
 * @param {number} maxKeywords - Maximum number of keywords to extract
 * @returns {Promise<Array<string>>} Array of keywords
 */
export async function extractKeywords(text, maxKeywords = 10) {
  if (!text || typeof text !== 'string') return [];
  
  try {
    // Truncate text if it's too long
    const truncatedText = truncateText(text, 4000);
    
    // Use OpenAI to extract keywords
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are a document analysis assistant. Extract the ${maxKeywords} most important keywords or key phrases from the following text. Return only a JSON array of strings with no explanation.`
        },
        {
          role: 'user',
          content: truncatedText
        }
      ],
      response_format: { type: 'json_object' }
    });
    
    // Parse the response
    const content = response.choices[0].message.content;
    const keywords = JSON.parse(content).keywords || [];
    
    return keywords;
  } catch (error) {
    console.error('Error extracting keywords with OpenAI:', error);
    
    // Fall back to basic keyword extraction
    return fallbackExtractKeywords(text, maxKeywords);
  }
}

/**
 * Generate a summary from document content using OpenAI
 * @param {string} text - The document text content
 * @param {number} maxLength - Maximum length of the summary
 * @returns {Promise<string>} Document summary
 */
export async function generateSummary(text, maxLength = 200) {
  if (!text || typeof text !== 'string') return '';
  
  try {
    // Truncate text if it's too long
    const truncatedText = truncateText(text, 4000);
    
    // Use OpenAI to generate a summary
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are a document summarization assistant. Create a concise summary of the following text in about ${maxLength} characters. The summary should capture the main points and be coherent.`
        },
        {
          role: 'user',
          content: truncatedText
        }
      ]
    });
    
    // Get the summary from the response
    const summary = response.choices[0].message.content.trim();
    
    return summary;
  } catch (error) {
    console.error('Error generating summary with OpenAI:', error);
    
    // Fall back to basic summary generation
    return fallbackGenerateSummary(text, maxLength);
  }
}

/**
 * Detect language of document content
 * @param {string} text - The document text content
 * @returns {Promise<string>} Detected language code (e.g., 'en', 'es', 'fr')
 */
export async function detectLanguage(text) {
  if (!text || typeof text !== 'string') return 'en';
  
  try {
    // Truncate text if it's too long
    const truncatedText = truncateText(text, 1000);
    
    // Use OpenAI to detect language
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a language detection assistant. Identify the language of the following text and return only the ISO 639-1 language code (e.g., "en" for English, "es" for Spanish, etc.) with no explanation.'
        },
        {
          role: 'user',
          content: truncatedText
        }
      ]
    });
    
    // Get the language code from the response
    const languageCode = response.choices[0].message.content.trim().toLowerCase();
    
    return languageCode;
  } catch (error) {
    console.error('Error detecting language with OpenAI:', error);
    
    // Fall back to assuming English
    return 'en';
  }
}

/**
 * Enrich document metadata with extracted information
 * @param {Object} metadata - Base metadata object
 * @param {string} text - Document content
 * @param {Object} options - Processing options
 * @param {boolean} options.useOpenAI - Whether to use enhanced OpenAI processing
 * @returns {Promise<Object>} Enriched metadata
 */
export async function enrichMetadata(metadata, text, options = {}) {
  if (!text) return metadata;
  
  const enriched = { ...metadata };
  const useOpenAI = options.useOpenAI === true;
  
  try {
    // Process in parallel for efficiency
    const [keywords, summary, language, topics, entities, sentiment] = await Promise.all([
      extractKeywords(text, useOpenAI ? 15 : 10),
      generateSummary(text, useOpenAI ? 300 : 200),
      detectLanguage(text),
      useOpenAI ? extractTopics(text) : Promise.resolve([]),
      useOpenAI ? extractEntities(text) : Promise.resolve([]),
      useOpenAI ? analyzeSentiment(text) : Promise.resolve(null)
    ]);
    
    // Add extracted information to metadata
    enriched.keywords = keywords;
    enriched.summary = summary;
    enriched.language = language;
    
    // Add enhanced metadata if OpenAI is enabled
    if (useOpenAI) {
      enriched.topics = topics;
      enriched.entities = entities;
      enriched.sentiment = sentiment;
      enriched.processed_with = 'openai_enhanced';
    }
    
    return enriched;
  } catch (error) {
    console.error('Error enriching metadata:', error);
    
    // Fall back to basic extraction if OpenAI fails
    enriched.keywords = fallbackExtractKeywords(text);
    enriched.summary = fallbackGenerateSummary(text);
    enriched.language = 'en';
    
    return enriched;
  }
}

/**
 * Fallback keyword extraction using basic frequency analysis
 * @param {string} text - The document text content
 * @param {number} maxKeywords - Maximum number of keywords to extract
 * @returns {Array<string>} Array of keywords
 */
function fallbackExtractKeywords(text, maxKeywords = 10) {
  // Remove common stop words
  const stopWords = new Set([
    'a', 'an', 'the', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 
    'in', 'on', 'at', 'to', 'for', 'with', 'by', 'about', 'as', 'of',
    'from', 'this', 'that', 'these', 'those', 'it', 'its'
  ]);
  
  // Tokenize and count word frequencies
  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .split(/\s+/) // Split by whitespace
    .filter(word => 
      word.length > 3 && // Only words longer than 3 characters
      !stopWords.has(word) && // Exclude stop words
      !(/^\d+$/.test(word)) // Exclude numbers
    );
  
  // Count word frequencies
  const wordCounts = {};
  for (const word of words) {
    wordCounts[word] = (wordCounts[word] || 0) + 1;
  }
  
  // Sort by frequency and get top keywords
  return Object.entries(wordCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxKeywords)
    .map(([word]) => word);
}

/**
 * Fallback summary generation using first few sentences
 * @param {string} text - The document text content
 * @param {number} maxLength - Maximum length of the summary
 * @returns {string} Document summary
 */
function fallbackGenerateSummary(text, maxLength = 200) {
  // Simple summary: first few sentences
  const sentences = text
    .replace(/([.!?])\s+/g, '$1|')
    .split('|')
    .filter(sentence => sentence.trim().length > 10);
  
  let summary = '';
  let currentLength = 0;
  
  for (const sentence of sentences) {
    if (currentLength + sentence.length <= maxLength) {
      summary += (summary ? ' ' : '') + sentence;
      currentLength += sentence.length;
    } else {
      break;
    }
  }
  
  return summary.trim();
}

/**
 * Extract main topics from document content using OpenAI
 * @param {string} text - The document text content
 * @returns {Promise<Array<{name: string, confidence: number}>>} Array of topics with confidence scores
 */
export async function extractTopics(text) {
  if (!text || typeof text !== 'string') return [];
  
  try {
    // Truncate text if it's too long
    const truncatedText = truncateText(text, 4000);
    
    // Use OpenAI to extract topics
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are a document analysis assistant. Extract the main topics or themes from the following text. 
                    For each topic, provide a confidence score between 0 and 1 indicating how central this topic is to the document.
                    Return the result as a JSON array of objects with "name" and "confidence" properties, with no explanation.
                    Example: [{"name": "Artificial Intelligence", "confidence": 0.95}, {"name": "Machine Learning", "confidence": 0.8}]`
        },
        {
          role: 'user',
          content: truncatedText
        }
      ],
      response_format: { type: 'json_object' }
    });
    
    // Parse the response
    const content = response.choices[0].message.content;
    const topics = JSON.parse(content).topics || [];
    
    return topics;
  } catch (error) {
    console.error('Error extracting topics with OpenAI:', error);
    return [];
  }
}

/**
 * Extract named entities from document content using OpenAI
 * @param {string} text - The document text content
 * @returns {Promise<Array<{text: string, type: string, relevance: number}>>} Array of entities
 */
export async function extractEntities(text) {
  if (!text || typeof text !== 'string') return [];
  
  try {
    // Truncate text if it's too long
    const truncatedText = truncateText(text, 4000);
    
    // Use OpenAI to extract entities
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are a document analysis assistant. Extract named entities from the following text.
                    Identify people, organizations, locations, dates, and other important entities.
                    For each entity, provide its type and a relevance score between 0 and 1.
                    Return the result as a JSON array of objects with "text", "type", and "relevance" properties, with no explanation.
                    Example: [{"text": "John Smith", "type": "PERSON", "relevance": 0.8}, {"text": "Microsoft", "type": "ORGANIZATION", "relevance": 0.9}]`
        },
        {
          role: 'user',
          content: truncatedText
        }
      ],
      response_format: { type: 'json_object' }
    });
    
    // Parse the response
    const content = response.choices[0].message.content;
    const entities = JSON.parse(content).entities || [];
    
    return entities;
  } catch (error) {
    console.error('Error extracting entities with OpenAI:', error);
    return [];
  }
}

/**
 * Analyze sentiment of document content using OpenAI
 * @param {string} text - The document text content
 * @returns {Promise<{score: number, label: string}>} Sentiment analysis result
 */
export async function analyzeSentiment(text) {
  if (!text || typeof text !== 'string') return null;
  
  try {
    // Truncate text if it's too long
    const truncatedText = truncateText(text, 4000);
    
    // Use OpenAI to analyze sentiment
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are a document analysis assistant. Analyze the sentiment of the following text.
                    Provide a sentiment score between -1 (very negative) and 1 (very positive), and a label (negative, neutral, or positive).
                    Return the result as a JSON object with "score" and "label" properties, with no explanation.
                    Example: {"score": 0.75, "label": "positive"}`
        },
        {
          role: 'user',
          content: truncatedText
        }
      ],
      response_format: { type: 'json_object' }
    });
    
    // Parse the response
    const content = response.choices[0].message.content;
    const sentiment = JSON.parse(content);
    
    return sentiment;
  } catch (error) {
    console.error('Error analyzing sentiment with OpenAI:', error);
    return null;
  }
}

/**
 * Truncate text to a maximum number of characters
 * @param {string} text - Text to truncate
 * @param {number} maxChars - Maximum number of characters
 * @returns {string} - Truncated text
 */
function truncateText(text, maxChars = 4000) {
  if (!text) return '';
  return text.length > maxChars ? text.substring(0, maxChars) : text;
}
