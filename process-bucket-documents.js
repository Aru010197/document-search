/**
 * Process Documents from Supabase Storage Bucket
 * 
 * This script fetches documents directly from the Supabase storage bucket named "documents",
 * processes them, and stores the results in the database.
 * It skips documents that have already been processed.
 * 
 * Usage:
 * node process-bucket-documents.js
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
const { v4: uuidv4 } = require('uuid');

// Import required modules
const pdfParse = require('pdf-parse');
const { enrichMetadata } = require('./src/lib/metadata-extractors');
const { generateEmbedding } = require('./src/lib/embeddings');

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

/**
 * Main function to process documents from the storage bucket
 */
async function processDocumentsFromBucket() {
  try {
    console.log('Starting document processing from storage bucket...');
    
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
    
    // List all files in the "documents" bucket
    console.log('Listing files in the "documents" bucket...');
    const { data: files, error: listError } = await supabase
      .storage
      .from('documents')
      .list();
    
    if (listError) {
      console.error('Error listing files in bucket:', listError);
      return;
    }
    
    if (!files || files.length === 0) {
      console.log('No files found in the "documents" bucket.');
      return;
    }
    
    console.log(`Found ${files.length} files in the bucket.`);
    
    // Get list of already processed documents
    console.log('Checking for already processed documents...');
    const { data: existingDocs, error: fetchError } = await supabase
      .from('documents')
      .select('storage_path');
    
    if (fetchError) {
      console.error('Error fetching existing documents:', fetchError);
      return;
    }
    
    // Create a set of already processed storage paths
    const processedPaths = new Set(existingDocs?.map(doc => doc.storage_path) || []);
    console.log(`Found ${processedPaths.size} already processed documents.`);
    
    // Filter files that haven't been processed yet
    const filesToProcess = files.filter(file => {
      // Skip folders
      if (file.id.endsWith('/')) return false;
      
      // Skip files that have already been processed
      return !processedPaths.has(file.name);
    });
    
    console.log(`${filesToProcess.length} files need to be processed.`);
    
    if (filesToProcess.length === 0) {
      console.log('All files have already been processed. No action needed.');
      return;
    }
    
    // Process each file
    let processedCount = 0;
    let errorCount = 0;
    
    for (const file of filesToProcess) {
      try {
        console.log(`\nProcessing file: ${file.name}`);
        
        // Download the file
        console.log(`Downloading file from storage...`);
        const { data: fileData, error: downloadError } = await supabase
          .storage
          .from('documents')
          .download(file.name);
        
        if (downloadError) {
          console.error(`Error downloading file: ${downloadError.message}`);
          errorCount++;
          continue;
        }
        
        // Save to temporary file
        const tempFilePath = path.join(tempDir, file.name);
        const buffer = Buffer.from(await fileData.arrayBuffer());
        await writeFileAsync(tempFilePath, buffer);
        
        // Determine file type from extension
        const fileExtension = path.extname(file.name).toLowerCase().substring(1);
        let fileType;
        
        switch (fileExtension) {
          case 'pdf':
            fileType = 'pdf';
            break;
          case 'doc':
          case 'docx':
            fileType = 'docx';
            break;
          case 'ppt':
          case 'pptx':
            fileType = 'pptx';
            break;
          case 'xls':
          case 'xlsx':
            fileType = 'xlsx';
            break;
          default:
            fileType = fileExtension;
        }
        
        // Extract content and metadata
        console.log(`Extracting content and metadata from ${fileType} file...`);
        const { text, metadata, chunks } = await extractContent(buffer, fileType);
        
        // Enrich metadata
        console.log('Enriching metadata...');
        const enrichedMetadata = await enrichMetadata(metadata, text, { useOpenAI: true });
        
        // Generate embeddings for the document
        console.log('Generating embeddings...');
        const embedding = await generateEmbedding(text);
        
        // Create document entry in the database
        const documentId = uuidv4();
        const now = new Date().toISOString();
        
        console.log(`Creating document entry in database...`);
        const { error: insertError } = await supabase
          .from('documents')
          .insert({
            id: documentId,
            filename: path.basename(file.name),
            filetype: fileType,
            filesize: buffer.length,
            storage_path: file.name,
            title: enrichedMetadata.title || path.basename(file.name),
            author: enrichedMetadata.author || null,
            upload_date: now,
            last_modified: enrichedMetadata.modified_date || now,
            text_content: text,
            embedding: embedding,
            metadata: enrichedMetadata,
            status: 'processed'
          });
        
        if (insertError) {
          console.error(`Error creating document entry: ${insertError.message}`);
          errorCount++;
          continue;
        }
        
        // Create document chunks
        console.log(`Creating ${chunks.length} document chunks...`);
        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i];
          
          // Generate embedding for the chunk
          const chunkEmbedding = await generateEmbedding(chunk.content);
          
          // Insert chunk into database
          const { error: chunkError } = await supabase
            .from('document_chunks')
            .insert({
              id: uuidv4(),
              document_id: documentId,
              chunk_index: i,
              content: chunk.content,
              embedding: chunkEmbedding,
              metadata: {
                ...chunk.metadata,
                document_id: documentId
              }
            });
          
          if (chunkError) {
            console.error(`Error creating chunk ${i}: ${chunkError.message}`);
          }
        }
        
        // Clean up the temporary file
        await unlinkAsync(tempFilePath);
        
        console.log(`Successfully processed ${file.name}`);
        processedCount++;
        
      } catch (fileError) {
        console.error(`Error processing file ${file.name}:`, fileError);
        errorCount++;
      }
    }
    
    console.log('\nProcessing complete!');
    console.log(`Files processed successfully: ${processedCount}`);
    console.log(`Files with errors: ${errorCount}`);
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

/**
 * Extract content from a document based on its type
 * @param {Buffer} buffer - The file buffer
 * @param {string} fileType - The file type (pdf, docx, pptx, xlsx)
 * @returns {Promise<{text: string, metadata: Object, chunks: Array}>} Extracted text, metadata, and content chunks
 */
async function extractContent(buffer, fileType) {
  // Normalize file type
  const normalizedType = fileType.toLowerCase();
  
  switch (normalizedType) {
    case 'pdf':
      return extractPdfContent(buffer);
    case 'docx':
    case 'doc':
      return extractTextContent(buffer, 'Document');
    case 'pptx':
    case 'ppt':
      return extractTextContent(buffer, 'Presentation');
    case 'xlsx':
    case 'xls':
      return extractTextContent(buffer, 'Spreadsheet');
    default:
      return extractTextContent(buffer, 'Unknown');
  }
}

/**
 * Extract content from a PDF file
 * @param {Buffer} buffer - The PDF file buffer
 * @returns {Promise<{text: string, metadata: Object, chunks: Array}>} Extracted text, metadata, and content chunks
 */
async function extractPdfContent(buffer) {
  try {
    const data = await pdfParse(buffer);
    
    // Extract text content
    const text = data.text;
    
    // Extract metadata
    const metadata = {
      title: data.info?.Title || null,
      author: data.info?.Author || null,
      created_date: data.info?.CreationDate ? new Date(data.info.CreationDate).toISOString() : null,
      modified_date: data.info?.ModDate ? new Date(data.info.ModDate).toISOString() : null,
      page_count: data.numpages,
      content_type: 'pdf'
    };
    
    // Create content chunks (by paragraphs)
    const chunks = createContentChunks(text);
    
    return {
      text,
      metadata,
      chunks
    };
  } catch (error) {
    console.error('PDF extraction error:', error);
    // Return empty content if extraction fails
    return {
      text: '',
      metadata: { content_type: 'pdf' },
      chunks: []
    };
  }
}

/**
 * Extract content from a text-based file
 * @param {Buffer} buffer - The file buffer
 * @param {string} contentType - The content type description
 * @returns {Promise<{text: string, metadata: Object, chunks: Array}>} Extracted text, metadata, and content chunks
 */
async function extractTextContent(buffer, contentType) {
  try {
    // Convert buffer to text (assuming UTF-8 encoding)
    const text = buffer.toString('utf8');
    
    // Basic metadata
    const metadata = {
      title: null,
      author: null,
      created_date: null,
      modified_date: null,
      content_type: contentType.toLowerCase()
    };
    
    // Create content chunks
    const chunks = createContentChunks(text);
    
    return {
      text,
      metadata,
      chunks
    };
  } catch (error) {
    console.error(`${contentType} extraction error:`, error);
    // Return empty content if extraction fails
    return {
      text: '',
      metadata: { content_type: contentType.toLowerCase() },
      chunks: []
    };
  }
}

/**
 * Create content chunks from text
 * @param {string} text - The text to chunk
 * @returns {Array<{content: string, metadata: Object}>} Array of content chunks
 */
function createContentChunks(text) {
  // Split by paragraphs (double newlines)
  const paragraphs = text.split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(p => p.length > 0);
  
  // Create chunks with a maximum size
  const MAX_CHUNK_SIZE = 1000; // characters
  const chunks = [];
  
  let currentChunk = '';
  let currentChunkIndex = 0;
  
  for (const paragraph of paragraphs) {
    // If adding this paragraph would exceed the max size, create a new chunk
    if (currentChunk.length + paragraph.length > MAX_CHUNK_SIZE && currentChunk.length > 0) {
      chunks.push({
        content: currentChunk,
        metadata: { 
          type: 'text_chunk',
          index: currentChunkIndex
        }
      });
      currentChunk = paragraph;
      currentChunkIndex++;
    } else {
      // Add to current chunk
      currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
    }
  }
  
  // Add the last chunk if it has content
  if (currentChunk.length > 0) {
    chunks.push({
      content: currentChunk,
      metadata: { 
        type: 'text_chunk',
        index: currentChunkIndex
      }
    });
  }
  
  return chunks;
}

// Run the script
processDocumentsFromBucket();
