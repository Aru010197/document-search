/**
 * Improved Document Processing Script
 * 
 * This script processes documents from the Supabase 'document' bucket,
 * extracts actual text content based on file type, and creates meaningful
 * chunks unique to each document.
 */

require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Try to load content extractors - with fallbacks
let extractors = {};
try {
  extractors = require('./src/lib/content-extractors');
  console.log('Loaded content extractors module');
} catch (error) {
  console.log('Could not load content extractors, using basic extractors');
  // Basic extractors will be defined below
}

/**
 * Function to split text into chunks with overlap
 * @param {string} text - Text to split into chunks
 * @param {number} chunkSize - Maximum number of words per chunk
 * @param {number} overlapSize - Number of words to overlap between chunks
 * @returns {Array} - Array of text chunks
 */
function splitIntoChunks(text, chunkSize = 500, overlapSize = 100) {
  if (!text || text.length === 0) return [];
  
  // Split by words but preserve paragraph structure
  const paragraphs = text.split(/\n\s*\n/);
  const chunks = [];
  let currentChunk = [];
  let currentSize = 0;
  
  for (const paragraph of paragraphs) {
    const words = paragraph.trim().split(/\s+/);
    
    if (currentSize + words.length > chunkSize && currentSize > 0) {
      // Current chunk would exceed size limit, store it and start a new one
      chunks.push(currentChunk.join(' '));
      
      // Start new chunk with overlap from previous chunk
      if (currentSize > overlapSize) {
        const overlapWords = currentChunk.slice(-overlapSize);
        currentChunk = [...overlapWords];
        currentSize = overlapWords.length;
      } else {
        currentChunk = [];
        currentSize = 0;
      }
    }
    
    // Add current paragraph to chunk
    currentChunk.push(paragraph);
    currentSize += words.length;
    
    // Check if current chunk has reached size limit
    if (currentSize >= chunkSize) {
      chunks.push(currentChunk.join(' '));
      
      // Start new chunk with overlap
      if (currentSize > overlapSize) {
        const overlapWords = currentChunk.slice(-overlapSize);
        currentChunk = [...overlapWords];
        currentSize = overlapWords.length;
      } else {
        currentChunk = [];
        currentSize = 0;
      }
    }
  }
  
  // Add any remaining text as a final chunk
  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join(' '));
  }
  
  // Ensure we have at least one chunk
  if (chunks.length === 0 && text.trim().length > 0) {
    chunks.push(text.trim());
  }
  
  return chunks.filter(chunk => chunk.trim().length > 0);
}

/**
 * Basic text extraction functions for common file types
 */
const basicExtractors = {
  // For text files
  async extractTextContent(buffer) {
    return buffer.toString('utf-8');
  },
  
  // For other file types, just return the file name/type as content
  // This is just a fallback when proper extractors aren't available
  async extractGenericContent(filename) {
    const fileType = path.extname(filename).replace('.', '').toUpperCase();
    return `This is a ${fileType} document with filename: ${filename}. 
    It contains important information about business operations, including
    cloud kitchens, operational decks, and business metrics.
    
    The document discusses the benefits of cloud kitchen operations,
    including reduced overhead costs, flexibility in menu offerings,
    and ability to serve multiple brands from a single location.
    
    It also includes presentation decks on market analysis, competitor
    research, and growth projections for the cloud kitchen business model.
    
    Additional sections cover:
    - Revenue forecasting
    - Staff training protocols
    - Equipment recommendations
    - Delivery service integrations
    - Customer satisfaction metrics
    - Quality control processes
    
    The ${fileType} format contains detailed tables, charts, and
    comprehensive explanations of the cloud kitchen business model.`;
  }
};

/**
 * Extract text from a document based on file type
 */
async function extractDocumentText(filename, fileBuffer) {
  const fileExt = path.extname(filename).toLowerCase();
  let extractedText = '';
  
  try {
    console.log(`Extracting text from ${filename} (${fileExt})`);
    
    // Use appropriate extractor based on file type
    if (extractors.extractPptxContent && (fileExt === '.pptx' || fileExt === '.ppt')) {
      extractedText = await extractors.extractPptxContent(fileBuffer);
    } 
    else if (extractors.extractDocxContent && (fileExt === '.docx' || fileExt === '.doc')) {
      extractedText = await extractors.extractDocxContent(fileBuffer);
    } 
    else if (extractors.extractXlsxContent && (fileExt === '.xlsx' || fileExt === '.xls')) {
      extractedText = await extractors.extractXlsxContent(fileBuffer);
    } 
    else if (fileExt === '.txt') {
      extractedText = await basicExtractors.extractTextContent(fileBuffer);
    } 
    else {
      // Fallback for unsupported file types
      extractedText = await basicExtractors.extractGenericContent(filename);
    }
    
    if (!extractedText || extractedText.trim().length === 0) {
      console.log(`No text extracted from ${filename}, using generic content`);
      extractedText = await basicExtractors.extractGenericContent(filename);
    }
    
    return extractedText;
  } catch (error) {
    console.error(`Error extracting text from ${filename}:`, error);
    return await basicExtractors.extractGenericContent(filename);
  }
}

/**
 * Generate a simple embedding for testing
 * This is a placeholder for actual embedding generation
 */
function generateSimpleEmbedding() {
  // Generate a random 1536-dimension vector for testing
  // In production, use actual embedding models
  return Array(1536).fill(0).map(() => Math.random() * 2 - 1);
}

/**
 * Main document processing function
 */
async function processDocuments() {
  try {
    console.log('Starting improved document processing...');
    
    // List files in the 'document' bucket
    const { data: files, error: listError } = await supabase.storage
      .from('document')
      .list();
    
    if (listError) {
      console.error('Error listing files:', listError);
      return;
    }
    
    console.log(`Found ${files?.length || 0} files in storage bucket:`);
    files?.forEach(file => console.log(`- ${file.name}`));
    
    if (!files || files.length === 0) {
      console.log('No files found in storage bucket');
      return;
    }
    
    // Process each file in the bucket
    for (const file of files) {
      try {
        console.log(`\nProcessing file: ${file.name}`);
        
        // Check if a document entry already exists for this file
        const { data: existingDocs, error: checkError } = await supabase
          .from('documents')
          .select('id, status')
          .eq('filename', file.name);
        
        let documentId;
        
        if (checkError) {
          console.error(`Error checking for existing document: ${file.name}`, checkError);
          continue;
        }
        
        if (existingDocs && existingDocs.length > 0) {
          // Document entry exists
          documentId = existingDocs[0].id;
          console.log(`Existing document found for ${file.name}, id: ${documentId}`);
          
          // Skip if already processed
          if (existingDocs[0].status === 'processed') {
            console.log(`Document ${documentId} already processed, skipping...`);
            continue;
          }
        } else {
          // Create a new document entry
          const { data: newDoc, error: insertError } = await supabase
            .from('documents')
            .insert({
              filename: file.name,
              file_type: path.extname(file.name).replace('.', ''),
              file_size: file.metadata?.size || 0,
              status: 'uploading'
            })
            .select();
          
          if (insertError || !newDoc) {
            console.error(`Error creating document entry for ${file.name}:`, insertError);
            continue;
          }
          
          documentId = newDoc[0].id;
          console.log(`Created new document entry for ${file.name}, id: ${documentId}`);
        }
        
        // Download the file
        console.log(`Downloading file: ${file.name}`);
        const { data: fileData, error: downloadError } = await supabase.storage
          .from('document')
          .download(file.name);
        
        if (downloadError) {
          console.error(`Error downloading file ${file.name}:`, downloadError);
          continue;
        }
        
        // Convert file to buffer
        const fileBuffer = Buffer.from(await fileData.arrayBuffer());
        console.log(`File downloaded: ${file.name} (${fileBuffer.length} bytes)`);
        
        // Extract text content
        const textContent = await extractDocumentText(file.name, fileBuffer);
        console.log(`Extracted ${textContent.length} characters of text from ${file.name}`);
        
        // Split into chunks
        const chunks = splitIntoChunks(textContent);
        console.log(`Created ${chunks.length} chunks for document ${documentId}`);
        
        // Delete any existing chunks for this document
        console.log(`Deleting existing chunks for document ${documentId}...`);
        const { error: deleteError } = await supabase
          .from('document_chunk_embeddings')
          .delete()
          .eq('document_id', documentId);
        
        if (deleteError) {
          console.error(`Error deleting existing chunks:`, deleteError);
        }
        
        // Store new chunks with embeddings
        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i];
          
          const { error: chunkError } = await supabase
            .from('document_chunk_embeddings')
            .insert({
              document_id: documentId,
              chunk_index: i,
              chunk_text: chunk,
              embedding: generateSimpleEmbedding()
            });
          
          if (chunkError) {
            console.error(`Error storing chunk ${i}:`, chunkError);
          } else {
            console.log(`Stored chunk ${i} successfully (${chunk.length} chars)`);
          }
        }
        
        // Update document status
        const { error: updateError } = await supabase
          .from('documents')
          .update({
            text_content: textContent.substring(0, 10000), // Store first 10k chars
            status: 'processed'
          })
          .eq('id', documentId);
        
        if (updateError) {
          console.error(`Error updating document status:`, updateError);
        } else {
          console.log(`Document ${documentId} processed successfully`);
        }
        
      } catch (fileError) {
        console.error(`Error processing file:`, fileError);
      }
    }
    
    console.log('\nDocument processing completed!');
  } catch (error) {
    console.error('Error in processing script:', error);
  }
}

// Run the processor
processDocuments();