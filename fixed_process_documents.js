/**
 * Fixed Document Processing Script
 * 
 * This script processes documents from the Supabase storage bucket,
 * extracts text content, generates embeddings, and stores them in the database.
 * It fixes the "quotaExceeded is not defined" error from the original script.
 * 
 * Usage:
 * node fixed_process_documents.js
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { promisify } = require('util');
const writeFileAsync = promisify(fs.writeFile);
const unlinkAsync = promisify(fs.unlink);
const mkdirAsync = promisify(fs.mkdir);
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const OpenAI = require('openai');
const tf = require('@tensorflow/tfjs-node');
const use = require('@tensorflow-models/universal-sentence-encoder');

// Import our text processing pipeline
const textProcessing = require('./src/lib/text-processing');
const embeddings = require('./src/lib/embeddings');

// Initialize Supabase client with environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Supabase credentials not found.');
  process.exit(1);
}

console.log('Using Supabase URL:', supabaseUrl);
console.log('Supabase Service Key exists:', !!supabaseServiceKey);

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
  },
});

// Initialize OpenAI client with environment variable
const openaiApiKey = process.env.OPENAI_API_KEY;
let openai;
if (openaiApiKey) {
  console.log('OpenAI API key exists, initializing client');
  openai = new OpenAI({
    apiKey: openaiApiKey,
  });
}

// Embedding provider configuration from environment variable
const embeddingProvider = process.env.NEXT_PUBLIC_EMBEDDING_PROVIDER || 'sbert'; // Use 'sbert' or 'openai'
console.log('Using embedding provider:', embeddingProvider);

// Initialize Universal Sentence Encoder model
let useModel;

/**
 * Main function to process documents
 */
async function processDocuments() {
  console.log('Starting document processing...');
  console.log('IMPORTANT: This script will read the content of documents and generate embeddings for semantic search.');
  try {
    console.log('Checking for documents that need processing...');
    
    // Check if the necessary tables exist
    console.log('Checking if the required tables exist...');
    const { error: tableCheckError } = await supabase
      .from('documents')
      .select('id')
      .limit(1);
    
    if (tableCheckError) {
      console.error('Error: The "documents" table does not exist or is not accessible.');
      console.error('Please run the schema.sql script to create the necessary tables.');
      console.error('Error details:', tableCheckError.message);
      return;
    }
    
    // Fetch documents directly from Supabase Storage bucket
    console.log('Fetching documents from Supabase Storage bucket...');
    const { data: files, error: storageError } = await supabase
      .storage
      .from('document') // Ensure this matches your bucket name
      .list();

    if (storageError) {
      console.error('Error fetching files from Supabase Storage:', storageError.message);
      return;
    }

    if (!files || files.length === 0) {
      console.log('No files found in the Supabase Storage bucket.');
      return;
    }

    console.log(`Found ${files.length} files in the Supabase Storage bucket.`);
    
    // Create a temporary directory for downloads
    const tempDir = path.join(os.tmpdir(), 'document-search-app');
    try {
      await mkdirAsync(tempDir, { recursive: true });
    } catch (err) {
      if (err.code !== 'EEXIST') {
        console.error('Error creating temporary directory:', err);
        return;
      }
    }
    
    // Process each file from the storage bucket
    let processedCount = 0;
    let errorCount = 0;

    for (const file of files) {
      try {
        console.log(`Processing file: ${file.name}`);

        // Skip unsupported file types gracefully
        if (!file.name.endsWith('.pdf') && !file.name.endsWith('.docx')) {
          console.warn(`Unsupported file type: ${file.name}. Skipping.`);
          continue;
        }

        // Download the file
        const { data: fileData, error: downloadError } = await supabase
          .storage
          .from('document')
          .download(file.name);

        if (downloadError) {
          console.error(`Error downloading file: ${downloadError.message}`);
          errorCount++;
          continue;
        }

        // Convert the file data to a buffer
        const fileBuffer = Buffer.from(await fileData.arrayBuffer());

        // Log the success of the file download
        console.log(`Successfully downloaded file: ${file.name}`);

        // Save to temporary file
        const tempFilePath = path.join(tempDir, file.name);
        await writeFileAsync(tempFilePath, fileBuffer);

        // Extract text based on file type
        console.log(`Extracting text content...`);
        let textContent = '';

        try {
          console.log('Reading the entire file content for contextual search...');
          
          if (file.name.endsWith('.pdf')) {
            console.log('Processing PDF file...');
            const pdfData = await pdfParse(fileBuffer);
            textContent = pdfData.text;
            console.log(`Extracted ${textContent.length} characters of text from PDF`);
          } else if (file.name.endsWith('.docx')) {
            console.log('Processing DOCX file...');
            const result = await mammoth.extractRawText({ path: tempFilePath });
            textContent = result.value;
            console.log(`Extracted ${textContent.length} characters of text from DOCX`);
          } else {
            console.log(`Unsupported file type: ${file.name}. Skipping.`);
            continue;
          }
        } catch (extractError) {
          console.error(`Error extracting text from ${file.name}:`, extractError);
          errorCount++;
          continue;
        }

        // Clean up the temporary file
        await unlinkAsync(tempFilePath);

        if (!textContent || textContent.trim().length === 0) {
          console.log(`No text content extracted from ${file.name}. Skipping.`);
          continue;
        }

        // Process and split text into chunks with advanced NLP pipeline
        console.log(`Processing and splitting text with advanced NLP pipeline...`);
        
        // Use the text processing module to process and chunk the text
        const processedResult = await textProcessing.processText(textContent, {
          cleanText: true,
          tokenize: true,
          normalize: true,
          useStemming: true,
          useLemmatization: true,
          performPOSTagging: true,
          performNER: true,
          performSentimentAnalysis: true,
          chunkSize: 1000,
          chunkOverlap: 200,
          generateKeywordIndex: true,
          useOpenAI: embeddingProvider === 'openai' && openaiApiKey // Only use OpenAI if provider is set and key exists
        });
        
        // Convert the processed chunks to the format expected by the embeddings module
        const chunks = processedResult.chunks.map(chunk => ({
          text: chunk.text,
          start: chunk.start,
          end: chunk.end,
          metadata: {
            wordCount: chunk.wordCount,
            sentenceCount: chunk.sentenceCount,
            entities: processedResult.analysis.entities ? 
              processedResult.analysis.entities.filter(e => 
                chunk.start <= e.position && e.position + e.text.length <= chunk.end
              ) : [],
            sentiment: processedResult.analysis.sentiment ? 
              processedResult.analysis.sentiment.score : 0
          }
        }));

        console.log(`Generated ${chunks.length} chunks with linguistic analysis.`);

        // Generate embeddings for chunks
        console.log(`Generating embeddings using ${embeddingProvider} provider...`);
        
        // Use the embeddings module to generate embeddings
        const chunksWithEmbeddings = await generateEmbeddings(chunks);

        // Store chunks in database
        console.log(`Storing chunks in database...`);
        for (let i = 0; i < chunksWithEmbeddings.length; i++) {
          const chunk = chunksWithEmbeddings[i];
          
          const { error: insertError } = await supabase
            .from('document_chunks')
            .insert({
              document_id: file.name,
              chunk_index: i,
              content: chunk.text,
              embedding: chunk.embedding,
              metadata: {
                document_id: file.name,
                chunk_index: i,
                char_start: chunk.start,
                char_end: chunk.end,
                wordCount: chunk.metadata?.wordCount || 0,
                sentenceCount: chunk.metadata?.sentenceCount || 0,
                entities: chunk.metadata?.entities || [],
                sentiment: chunk.metadata?.sentiment || 0
              }
            });
          
          if (insertError) {
            console.error(`Error storing chunk ${i}: ${insertError.message}`);
          }
        }

        console.log(`Successfully processed ${file.name}`);
        processedCount++;

      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error);
        errorCount++;
      }
    }

    console.log('\nProcessing complete!');
    console.log(`Files processed successfully: ${processedCount}`);
    console.log(`Files with errors: ${errorCount}`);
    console.log('\nYou can now search for documents in the application.');
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

/**
 * Generate embeddings for text chunks
 */
async function generateEmbeddings(chunks) {
  if (embeddingProvider === 'openai' && openaiApiKey) {
    return generateOpenAIEmbeddings(chunks);
  } else {
    return generateSBERTEmbeddings(chunks);
  }
}

/**
 * Generate embeddings using OpenAI API
 */
async function generateOpenAIEmbeddings(chunks) {
  const batchSize = 20; // OpenAI recommendation
  const results = [];
  
  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    const texts = batch.map(chunk => chunk.text);
    
    try {
      const response = await openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: texts,
      });
      
      const embeddings = response.data.map(item => item.embedding);
      
      for (let j = 0; j < batch.length; j++) {
        results.push({
          ...batch[j],
          embedding: embeddings[j]
        });
      }
      
      console.log(`Generated embeddings for chunks ${i+1} to ${i+batch.length}`);
      
    } catch (error) {
      console.error(`Error generating OpenAI embeddings for batch ${i}:`, error);
      console.log('Falling back to SBERT for this batch...');
      
      // Fall back to SBERT for this batch
      const sbertResults = await generateSBERTEmbeddingsForBatch(batch);
      results.push(...sbertResults);
    }
  }
  
  return results;
}

/**
 * Generate embeddings using Universal Sentence Encoder
 */
async function generateSBERTEmbeddings(chunks) {
  const batchSize = 50; // Process in smaller batches to avoid memory issues
  const results = [];
  
  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    results.push(...await generateSBERTEmbeddingsForBatch(batch));
  }
  
  return results;
}

/**
 * Generate SBERT embeddings for a batch of chunks
 */
async function generateSBERTEmbeddingsForBatch(batch) {
  const results = [];
  
  try {
    // Initialize the model if not already done
    if (!useModel) {
      console.log('Initializing Universal Sentence Encoder model...');
      useModel = await use.load();
      console.log('SBERT Model loaded successfully.');
    }
    
    const texts = batch.map(chunk => chunk.text);
    const embeddings = await useModel.embed(texts);
    const embeddingsArray = Array.from(await embeddings.array());
    
    for (let j = 0; j < batch.length; j++) {
      // Process the embedding to match the expected dimensions
      const processedEmbedding = processEmbeddingTo1536Dimensions(embeddingsArray[j]);
      
      results.push({
        ...batch[j],
        embedding: processedEmbedding
      });
    }
    
    console.log(`Generated SBERT embeddings for ${batch.length} chunks`);
    
  } catch (error) {
    console.error(`Error generating SBERT embeddings:`, error);
    // Add empty embeddings for failed batch
    for (let j = 0; j < batch.length; j++) {
      results.push({
        ...batch[j],
        embedding: []
      });
    }
  }
  
  return results;
}

/**
 * Process an embedding vector to match the expected dimensions
 * 
 * @param {number[]} embedding - The original embedding vector
 * @returns {number[]} - The processed embedding vector with the correct dimensions
 */
function processEmbeddingTo1536Dimensions(embedding) {
  // If the embedding is already 1536 dimensions, return it as is
  if (embedding.length === 1536) {
    return embedding;
  }
  
  // If the embedding is longer than 1536, truncate it
  if (embedding.length > 1536) {
    return embedding.slice(0, 1536);
  }
  
  // If the embedding is shorter than 1536, pad it with zeros
  const processedEmbedding = new Array(1536).fill(0);
  
  // Copy the original embedding values
  for (let i = 0; i < embedding.length; i++) {
    processedEmbedding[i] = embedding[i];
  }
  
  return processedEmbedding;
}

// Run the script
processDocuments();
