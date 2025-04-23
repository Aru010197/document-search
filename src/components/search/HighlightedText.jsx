import React from 'react';

/**
 * Component to highlight search terms within text
 * 
 * @param {Object} props
 * @param {string} props.text - The text to display
 * @param {string} props.highlight - The search term to highlight
 * @param {string} props.className - Additional CSS classes
 * @returns {JSX.Element}
 */
export default function HighlightedText({ text, highlight, className = '' }) {
  if (!text) return null;
  if (!highlight || highlight.trim() === '') return <span className={className}>{text}</span>;
  
  // Escape special characters in the highlight term for regex
  const escapedHighlight = highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  
  // Split the search term into individual words
  const highlightTerms = escapedHighlight
    .split(/\s+/)
    .filter(term => term.length > 1) // Only highlight terms with at least 2 characters
    .map(term => term.trim());
  
  // If no valid terms, return the original text
  if (highlightTerms.length === 0) return <span className={className}>{text}</span>;
  
  // Create a regex pattern to match any of the highlight terms
  const pattern = new RegExp(`(${highlightTerms.join('|')})`, 'gi');
  
  // Split the text by the highlight pattern
  const parts = text.split(pattern);
  
  return (
    <span className={className}>
      {parts.map((part, i) => {
        // Check if this part matches any of the highlight terms (case insensitive)
        const isHighlighted = highlightTerms.some(term => 
          part.toLowerCase() === term.toLowerCase()
        );
        
        return isHighlighted ? (
          <mark 
            key={i} 
            className="bg-primary-100 text-primary-800 px-0.5 rounded"
          >
            {part}
          </mark>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        );
      })}
    </span>
  );
}
