/**
 * Query Processor Module
 * 
 * This module provides advanced query processing capabilities to enhance
 * semantic understanding of search queries.
 */

// Import natural language processing libraries
const natural = require('natural');
const { WordTokenizer } = natural;
const wordTokenizer = new WordTokenizer();

 // Common stopwords that have low semantic value
 const STOPWORDS = new Set([
  'a', 'an','','collate', 'decks', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'and', 'for', 'with',
  'by', 'about', 'as', 'into', 'like', 'through', 'after', 'over', 'between','use case','use cases','usecases','usecase',
  'out', 'of', 'from', 'up', 'down', 'is', 'are', 'was', 'were', 'be', 'been',
  'being', 'have', 'has', 'had', 'do', 'does', 'did', 'can', 'could', 'will', 'find',
  'would', 'should', 'shall', 'may', 'might', 'must', 'that', 'which', 'who',
  'whom', 'whose', 'this', 'these', 'those', 'am', 'i', 'we', 'you', 'he', 'she',
  'they', 'it', 'me', 'us', 'him', 'her', 'them', 'my', 'our', 'your', 'his', 'files', 'file',
  'use', 'driven', 'all', 'extract','its', , 'related', 'their', 'mine', 'ours', 'yours', 'hers', 'theirs', 'give', 'get', 'show', 'me', 'ppt', 'doc', 'documment', 'documents'
]);

// Domain-specific terms that should be kept together
const DOMAIN_TERMS = [
  'health care', 'voice ai', 'cloud', 'healthcare', 'case study', 'case studies', 'machine learning',
  'artificial intelligence', 'data science', 'natural language processing',
  'computer vision', 'deep learning', 'neural network', 'big data',
  'data analytics', 'business intelligence', 'cloud computing', 'internet of things',
  'blockchain', 'virtual reality', 'augmented reality', 'mixed reality',
  'quantum computing', 'edge computing', 'cyber security', 'information security',
  'data privacy', 'digital transformation', 'user experience', 'user interface',
  'mobile app', 'web application', 'software development', 'agile methodology',
  'devops', 'continuous integration', 'continuous deployment', 'microservices',
  'serverless architecture', 'container orchestration', 'docker', 'kubernetes',
  'public health', 'mental health', 'primary care', 'secondary care', 'tertiary care',
  'preventive care', 'palliative care', 'emergency care', 'intensive care',
  'patient care', 'medical research', 'clinical trial', 'pharmaceutical',
  'medical device', 'health insurance', 'electronic health record', 'telemedicine',
  'remote patient monitoring', 'wearable technology', 'health informatics',
  'population health', 'precision medicine', 'personalized medicine',
  'genomic medicine', 'regenerative medicine', 'stem cell therapy', 'gene therapy',
  'immunotherapy', 'radiation therapy', 'chemotherapy', 'surgical procedure',
  'minimally invasive surgery', 'robotic surgery', 'diagnostic imaging',
  'medical imaging', 'laboratory testing', 'pathology', 'radiology', 'cardiology',
  'neurology', 'oncology', 'pediatrics', 'geriatrics', 'obstetrics', 'gynecology',
  'orthopedics', 'dermatology', 'ophthalmology', 'psychiatry', 'psychology',
  'physical therapy', 'occupational therapy', 'speech therapy', 'respiratory therapy',
  'nutrition', 'dietetics', 'pharmacy', 'nursing', 'midwifery', 'dentistry',
  'optometry', 'audiology', 'social work', 'health administration', 'public health',
  'epidemiology', 'biostatistics', 'health policy', 'health economics',
  'health disparities', 'health equity', 'social determinants of health',
  'environmental health', 'occupational health', 'global health', 'one health',
  'zoonotic disease', 'infectious disease', 'chronic disease', 'non-communicable disease',
  'mental illness', 'substance abuse', 'addiction', 'rehabilitation', 'recovery',
  'wellness', 'prevention', 'screening', 'diagnosis', 'treatment', 'management',
  'palliative care', 'end of life care', 'hospice', 'long term care', 'home health',
  'assisted living', 'skilled nursing', 'inpatient', 'outpatient', 'ambulatory care',
  'emergency department', 'urgent care', 'primary care physician', 'specialist',
  'consultant', 'attending physician', 'resident physician', 'medical student',
  'nurse practitioner', 'physician assistant', 'registered nurse', 'licensed practical nurse',
  'certified nursing assistant', 'medical assistant', 'paramedic', 'emergency medical technician',
  'community health worker', 'patient navigator', 'care coordinator', 'case manager',
  'social worker', 'therapist', 'counselor', 'psychologist', 'psychiatrist',
  'pharmacist', 'pharmacy technician', 'dietitian', 'nutritionist', 'physical therapist',
  'occupational therapist', 'speech language pathologist', 'respiratory therapist',
  'radiologic technologist', 'laboratory technician', 'phlebotomist', 'medical coder',
  'medical biller', 'health information technician', 'health educator', 'public health worker',
  'epidemiologist', 'biostatistician', 'health policy analyst', 'health economist',
  'healthcare administrator', 'healthcare executive', 'hospital administrator',
  'practice manager', 'clinic manager', 'department chair', 'chief medical officer',
  'chief nursing officer', 'chief executive officer', 'chief financial officer',
  'chief information officer', 'chief technology officer', 'chief operating officer',
  'board of directors', 'governing board', 'stakeholder', 'shareholder', 'investor',
  'payer', 'provider', 'supplier', 'vendor', 'contractor', 'consultant', 'advisor', 'pharma'
];

// Additional patterns for conversational queries and document type intent
const CONVERSATIONAL_PATTERNS = [
  { regex: /^(give|show|get|find|list|search|display|fetch|retrieve)\s+(me|us)?\s*/i, weight: 0 },
  { regex: /^(i\s+want|i\s+need|i'm\s+looking\s+for|looking\s+for|searching\s+for)\s*/i, weight: 0 },
  { regex: /^(can\s+you|could\s+you|please)\s*/i, weight: 0 },
  { regex: /^(what|which|where\s+are|how\s+to)\s*/i, weight: 0 },
  { regex: /(related\s+to|about|on|regarding|concerning|for)\s*$/i, weight: 0 }
];

// Document type detection patterns
const DOCUMENT_TYPE_PATTERNS = [
  // Presentations
  { regex: /\b(deck|decks|slide|slides|presentation|ppt|powerpoint)\b/i, type: 'presentation', weight: 1.2 },
  // Documents
  { regex: /\b(document|doc|documentation|paper|report|pdf)\b/i, type: 'document', weight: 1.1 },
  // Spreadsheets
  { regex: /\b(spreadsheet|excel|xls|xlsx|csv|data)\b/i, type: 'spreadsheet', weight: 1.1 },
  // Images
  { regex: /\b(image|photo|picture|jpg|jpeg|png)\b/i, type: 'image', weight: 1.1 },
  // Videos
  { regex: /\b(video|mp4|film|movie|recording)\b/i, type: 'video', weight: 1.1 }
];

// Domain-specific terms that are particularly important for your context
const IMPORTANT_DOMAINS = {
  'education': ['education', 'edtech', 'learning', 'teaching', 'school', 'university', 'college', 'student', 'course', 'curriculum'],
  'technology': ['tech', 'technology', 'software', 'hardware', 'app', 'application', 'platform', 'system', 'digital', 'online'],
  'business': ['business', 'company', 'enterprise', 'startup', 'corporate', 'market', 'industry', 'customer', 'client', 'strategy']
};

/**
 * Process a search query to enhance semantic understanding
 * 
 * @param {string} query - The original search query
 * @returns {Object} - Processed query information
 */
function processQuery(query) {
  if (!query || typeof query !== 'string') {
    return { 
      originalQuery: '',
      processedQuery: '',
      keyPhrases: [],
      keyTerms: [],
      stopwords: []
    };
  }
  
  // Normalize the query (lowercase, trim)
  const normalizedQuery = query.trim().toLowerCase();
  
  // Identify domain-specific terms and phrases in the query
  const { queryWithPlaceholders, keyPhrases } = identifyKeyPhrases(normalizedQuery);
  
  // Tokenize the query
  const tokens = wordTokenizer.tokenize(queryWithPlaceholders);
  
  // Separate key terms and stopwords
  const keyTerms = [];
  const stopwords = [];
  
  tokens.forEach(token => {
    // Check if the token is a placeholder for a key phrase
    if (token.startsWith('__KEYPHRASE_') && token.endsWith('__')) {
      // This is a placeholder, don't process it further
      return;
    }
    
    // Check if the token is a stopword
    if (STOPWORDS.has(token.toLowerCase())) {
      stopwords.push(token);
    } else {
      keyTerms.push(token);
    }
  });
  
  // Reconstruct the processed query with key phrases intact
  let processedQuery = normalizedQuery;
  
  // Replace placeholders with the original key phrases
  keyPhrases.forEach((phrase, index) => {
    processedQuery = processedQuery.replace(`__KEYPHRASE_${index}__`, phrase);
  });
  
  return {
    originalQuery: query,
    processedQuery,
    keyPhrases,
    keyTerms,
    stopwords
  };
}

/**
 * Identify key phrases in a query based on domain-specific terms
 * 
 * @param {string} query - The normalized query
 * @returns {Object} - Query with placeholders and identified key phrases
 */
function identifyKeyPhrases(query) {
  let modifiedQuery = query;
  const keyPhrases = [];
  
  // Sort domain terms by length (descending) to match longer phrases first
  const sortedDomainTerms = [...DOMAIN_TERMS].sort((a, b) => b.length - a.length);
  
  // Identify domain-specific terms in the query
  sortedDomainTerms.forEach(term => {
    if (modifiedQuery.includes(term)) {
      keyPhrases.push(term);
      // Replace the term with a placeholder to avoid tokenizing it
      const index = keyPhrases.length - 1;
      modifiedQuery = modifiedQuery.replace(term, `__KEYPHRASE_${index}__`);
    }
  });
  
  return {
    queryWithPlaceholders: modifiedQuery,
    keyPhrases
  };
}

/**
 * Generate an enhanced search query for semantic search
 * 
 * @param {string} query - The original search query
 * @returns {Object} - Enhanced query with extracted information
 */
function enhanceQueryForSemanticSearch(query) {
  if (!query || typeof query !== 'string') {
    return {
      enhancedQuery: '',
      keyTerms: [],
      originalQuery: ''
    };
  }

  const originalQuery = query.trim();
  
  // Process the query to extract key information
  const { 
    cleanedQuery, 
    documentTypes, 
    extractedKeywords,
    conversationalIntent
  } = parseConversationalQuery(originalQuery);
  
  // Get core query terms using the existing processor
  const processed = processQuery(cleanedQuery);
  
  // Combine extracted keywords with processed keyTerms and keyPhrases
  let keyTerms = [
    ...extractedKeywords,
    ...processed.keyTerms,
    ...processed.keyPhrases
  ];
  
  // Deduplicate keywords
  keyTerms = [...new Set(keyTerms)];
  
  // Construct the enhanced query that emphasizes important terms
  let enhancedQuery = cleanedQuery;
  
  // Add document type emphasis if detected (e.g. boost "presentation" terms)
  if (documentTypes.length > 0) {
    const fileTypeTerms = documentTypes.join(' ');
    enhancedQuery = `${enhancedQuery} ${fileTypeTerms}`;
    
    // Add the file types to the key terms
    documentTypes.forEach(type => {
      if (!keyTerms.includes(type)) {
        keyTerms.push(type);
      }
    });
  }
  
  // Add keywords emphasis
  if (keyTerms.length > 0) {
    // For each important domain, check if keywords fall into that domain
    // and add domain terms as context
    Object.entries(IMPORTANT_DOMAINS).forEach(([domain, domainTerms]) => {
      // Check if our query contains any terms from this domain
      const hasTermsInDomain = keyTerms.some(term => 
        domainTerms.some(domainTerm => 
          term.toLowerCase().includes(domainTerm.toLowerCase())
        )
      );
      
      // If yes, augment the query with domain context
      if (hasTermsInDomain) {
        // Add some domain context terms to improve semantic understanding
        const contextTerms = domainTerms.slice(0, 3); // Just use the first few terms
        enhancedQuery = `${enhancedQuery} ${contextTerms.join(' ')}`;
      }
    });
  }
  
  return {
    enhancedQuery: enhancedQuery,
    keyTerms: keyTerms,
    originalQuery: originalQuery,
    documentTypes: documentTypes,
    conversationalIntent: conversationalIntent
  };
}

/**
 * Parse conversational queries to extract clean search terms,
 * document type intents, and other relevant information
 * 
 * @param {string} query - The raw query string
 * @returns {Object} - Extracted information
 */
function parseConversationalQuery(query) {
  let cleanedQuery = query.toLowerCase().trim();
  let conversationalIntent = false;
  let documentTypes = [];
  let extractedKeywords = [];
  
  // Step 1: Detect and remove conversational patterns
  CONVERSATIONAL_PATTERNS.forEach(pattern => {
    if (pattern.regex.test(cleanedQuery)) {
      conversationalIntent = true;
      cleanedQuery = cleanedQuery.replace(pattern.regex, '').trim();
    }
  });

  // Step 2: Detect document type intent (like "decks" or "presentations")
  DOCUMENT_TYPE_PATTERNS.forEach(pattern => {
    if (pattern.regex.test(cleanedQuery)) {
      documentTypes.push(pattern.type);
      // Don't remove document type terms from the query - they're useful for search
    }
  });
  
  // Step 3: Extract prepositions that indicate the topic
  // Common pattern: "[action verb] [doc type] on/about/for [topic]"
  const topicPrepositionMatch = cleanedQuery.match(/\b(on|about|for|related\s+to|regarding)\s+(.+)$/i);
  if (topicPrepositionMatch) {
    const topic = topicPrepositionMatch[2].trim();
    // If we found a topic after a preposition, prioritize it
    extractedKeywords.push(topic);
    
    // Also extract multi-word phrases from the topic
    const topicWords = topic.split(/\s+/);
    if (topicWords.length > 1) {
      extractedKeywords.push(...topicWords.filter(word => word.length > 2));
    }
    
    // Replace the original query with just the topic for better semantic matching
    if (conversationalIntent) {
      cleanedQuery = topic;
    }
  }
  
  return {
    cleanedQuery,
    documentTypes,
    extractedKeywords,
    conversationalIntent
  };
}

// At the end of the file, add proper exports
module.exports = {
  enhanceQueryForSemanticSearch,
  processQuery,
  parseConversationalQuery,
  identifyKeyPhrases
};