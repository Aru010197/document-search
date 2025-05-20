/**
 * Process Documents Script
 * 
 * This script processes documents that have entries in the 'documents' table
 * and creates chunks in the 'document_chunk_embeddings' table.
 * It downloads files from the Supabase 'document' bucket, extracts text content,
 * splits into chunks, generates embeddings, and stores them in the database.
 */

require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Import required modules
const { extractDocxContent, extractPptxContent, extractXlsxContent } = require('./src/lib/content-extractors');
const { generateEmbedding } = require('./src/lib/embeddings');
const { EMBEDDING_PROVIDERS } = require('./src/config/embeddings');

// Function to split text into chunks
function splitIntoChunks(text, chunkSize = 1000, overlapSize = 200) {
  const words = text.split(/\s+/);
  const chunks = [];
  
  for (let i = 0; i < words.length; i += chunkSize - overlapSize) {
    const chunk = words.slice(i, i + chunkSize).join(' ');
    chunks.push(chunk);
  }
  
  return chunks;
}

async function processDocuments() {
  try {
    console.log('Starting document processing...');
    
    // Fetch unprocessed documents from Supabase
    const { data: documents, error } = await supabase
      .from('documents')
      .select('*')
      .eq('status', 'uploading'); // Only process documents that haven't been processed yet

    if (error) {
      console.error('Error fetching documents:', error);
      return;
    }

    console.log(`Found ${documents.length} documents to process.`);

    for (const document of documents) {
      try {
        console.log(`Processing document: ${document.id} - ${document.filename}`);
        
        // Get the file from Supabase storage bucket 'document'
        let fileBuffer;
        
        try {
          // List files in the 'document' bucket to confirm the file exists
          const { data: listData, error: listError } = await supabase.storage
            .from('document')
            .list();
            
          if (listError) {
            console.error(`Error listing files in document bucket:`, listError);
            continue;
          }
          
          console.log(`Files in document bucket:`, listData.map(file => file.name));
          
          // Download the file using the filename
          const { data, error: downloadError } = await supabase.storage
            .from('document')
            .download(document.filename);
          
          if (downloadError || !data) {
            console.error(`Error downloading file for document ${document.id}:`, downloadError);
            continue;
          }
          
          fileBuffer = await data.arrayBuffer();
          fileBuffer = Buffer.from(fileBuffer);
          
          console.log(`Successfully downloaded file: ${document.filename}`);
        } catch (downloadErr) {
          console.error(`Failed to download document ${document.id}:`, downloadErr);
          continue;
        }

        // Get file extension to determine document type
        const fileExt = path.extname(document.filename).toLowerCase();
        let textContent = '';
        
        // Extract text content based on file type
        try {
          if (fileExt === '.pptx' || fileExt === '.ppt') {
            textContent = await extractPptxContent(fileBuffer);
          } else if (fileExt === '.docx' || fileExt === '.doc') {
            textContent = await extractDocxContent(fileBuffer);
          } else if (fileExt === '.xlsx' || fileExt === '.xls') {
            textContent = await extractXlsxContent(fileBuffer);
          } else if (fileExt === '.txt') {
            textContent = fileBuffer.toString('utf-8');
          } else {
            console.error(`Unsupported file type for document ${document.id}: ${fileExt}`);
            continue;
          }
        } catch (extractionErr) {
          console.error(`Failed to extract content from document ${document.id}:`, extractionErr);
          continue;
        }

        if (!textContent) {
          console.error(`No text content extracted from document ${document.id}`);
          continue;
        }

        console.log(`Successfully extracted text from document ${document.id}`);
        
        // Split the text into chunks
        const chunks = splitIntoChunks(textContent);
        console.log(`Created ${chunks.length} chunks for document ${document.id}`);
        
        // Process each chunk and store in document_chunk_embeddings
        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i];
          
          try {
            // Generate embedding for chunk
            const embedding = await generateEmbedding(chunk, EMBEDDING_PROVIDERS.SBERT);
            
            // Store chunk and embedding in database
            const { error: chunkError } = await supabase
              .from('document_chunk_embeddings')
              .insert({
                document_id: document.id,
                chunk_index: i,
                chunk_text: chunk,
                embedding: embedding
              });
            
            if (chunkError) {
              console.error(`Error storing chunk ${i} for document ${document.id}:`, chunkError);
            } else {
              console.log(`Successfully stored chunk ${i} for document ${document.id}`);
            }
          } catch (embeddingErr) {
            console.error(`Error generating embedding for chunk ${i} of document ${document.id}:`, embeddingErr);
          }
        }
        
        // Update document with extracted text and status
        const { error: updateError } = await supabase
          .from('documents')
          .update({
            text_content: textContent,
            status: 'processed'
          })
          .eq('id', document.id);
        
        if (updateError) {
          console.error(`Error updating document ${document.id}:`, updateError);
        } else {
          console.log(`Successfully marked document ${document.id} as processed`);
        }
      } catch (docError) {
        console.error(`Error processing document ${document.id}:`, docError);
        
        // Update document status to error
        await supabase
          .from('documents')
          .update({ status: 'error' })
          .eq('id', document.id);
      }
    }
    
    console.log('Document processing completed!');
  } catch (error) {
    console.error('Error in document processing script:', error);
  }
}

processDocuments();
