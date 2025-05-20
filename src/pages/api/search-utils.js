/**
 * Search utility functions
 */

/**
 * Create a snippet from content with highlighted search terms
 * 
 * @param {string} content - The document content
 * @param {string} query - The search query
 * @param {number} maxLength - Maximum length of the snippet
 * @returns {string} - HTML snippet with highlighted search terms
 */
function createHighlightedSnippet(content, query, maxLength = 200) {
  if (!content) return '';
  
  // Normalize content and query for searching
  const normalizedContent = content.toLowerCase();
  const normalizedQuery = query.toLowerCase();
  const queryTerms = normalizedQuery.split(/\s+/).filter(term => term.length > 2);
  
  // Find the best position for the snippet
  let bestPosition = 0;
  let highestTermCount = 0;
  
  // Check term frequency in different windows
  const windowSize = 100;
  for (let i = 0; i < normalizedContent.length - windowSize; i += 20) {
    const window = normalizedContent.substring(i, i + windowSize);
    let termCount = 0;
    
    for (const term of queryTerms) {
      if (window.includes(term)) {
        termCount++;
      }
    }
    
    if (termCount > highestTermCount) {
      highestTermCount = termCount;
      bestPosition = i;
    }
  }
  
  // If no terms found, just take the beginning
  if (highestTermCount === 0) {
    bestPosition = 0;
  }
  
  // Extract snippet
  let startPos = Math.max(0, bestPosition - 20);
  let endPos = Math.min(content.length, startPos + maxLength);
  
  // Adjust to not cut words
  while (startPos > 0 && content[startPos] !== ' ' && content[startPos] !== '.') {
    startPos--;
  }
  
  while (endPos < content.length && content[endPos] !== ' ' && content[endPos] !== '.') {
    endPos++;
  }
  
  // Add ellipsis if needed
  const prefix = startPos > 0 ? '...' : '';
  const suffix = endPos < content.length ? '...' : '';
  
  // Extract the snippet text
  let snippetText = content.substring(startPos, endPos).trim();
  
  // First highlight the exact phrase if it exists
  const exactPhraseRegex = new RegExp(normalizedQuery.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'gi');
  snippetText = snippetText.replace(exactPhraseRegex, match => `<mark class="exact-phrase">${match}</mark>`);
  
  // Then highlight individual terms that weren't part of the exact phrase
  for (const term of queryTerms) {
    if (term.length < 3) continue; // Skip very short terms
    
    // Create a regex that matches the term with word boundaries
    // but not if it's already inside a mark tag
    const regex = new RegExp(`\\b${term}\\b(?![^<]*>)`, 'gi');
    snippetText = snippetText.replace(regex, match => `<mark>${match}</mark>`);
  }
  
  // Return the highlighted snippet
  return prefix + snippetText + suffix;
}

/**
 * Create a simple snippet from content
 * 
 * @param {string} content - The document content
 * @param {string} query - The search query
 * @param {number} maxLength - Maximum length of the snippet
 * @returns {string} - Plain text snippet
 */
function createSnippet(content, query, maxLength = 200) {
  if (!content) return '';
  
  // Normalize content and query
  const normalizedContent = content.toLowerCase();
  const normalizedQuery = query.toLowerCase();
  const queryTerms = normalizedQuery.split(/\s+/).filter(term => term.length > 2);
  
  // Find the best position for the snippet
  let bestPosition = 0;
  let highestTermCount = 0;
  
  // Check term frequency in different windows
  const windowSize = 100;
  for (let i = 0; i < normalizedContent.length - windowSize; i += 20) {
    const window = normalizedContent.substring(i, i + windowSize);
    let termCount = 0;
    
    for (const term of queryTerms) {
      if (window.includes(term)) {
        termCount++;
      }
    }
    
    if (termCount > highestTermCount) {
      highestTermCount = termCount;
      bestPosition = i;
    }
  }
  
  // If no terms found, just take the beginning
  if (highestTermCount === 0) {
    bestPosition = 0;
  }
  
  // Extract snippet
  let startPos = Math.max(0, bestPosition - 20);
  let endPos = Math.min(content.length, startPos + maxLength);
  
  // Adjust to not cut words
  while (startPos > 0 && content[startPos] !== ' ' && content[startPos] !== '.') {
    startPos--;
  }
  
  while (endPos < content.length && content[endPos] !== ' ' && content[endPos] !== '.') {
    endPos++;
  }
  
  // Add ellipsis if needed
  const prefix = startPos > 0 ? '...' : '';
  const suffix = endPos < content.length ? '...' : '';
  
  // Extract the snippet
  const snippet = prefix + content.substring(startPos, endPos).trim() + suffix;
  
  return snippet;
}

module.exports = {
  createHighlightedSnippet,
  createSnippet
};
