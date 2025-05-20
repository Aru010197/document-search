/**
 * Alternative Document Processing Script
 * 
 * This script processes documents using a modular pipeline.
 * It extracts text, processes it, generates embeddings, and stores the results.
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const contentExtractors = require('./src/lib/content-extractors');
const textProcessing = require('./src/lib/text-processing');
const embeddings = require('./src/lib/embeddings');
const fs = require('fs');

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function processDocuments() {
  console.log('Starting alternative document processing pipeline...');

  try {
    // Fetch documents from the database
    const { data: documents, error } = await supabase
      .from('documents')
      .select('id, filename, file_type, storage_path');

    if (error) {
      console.error('Error fetching documents:', error.message);
      return;
    }

    for (const doc of documents) {
      try {
        console.log(`Processing document: ${doc.filename}`);

        // Log the storage path for debugging
        console.log(`Document ID: ${doc.id}, Filename: ${doc.filename}, Storage Path: ${doc.storage_path}`);
        console.log(`Attempting to download file from storage path: ${doc.storage_path}`);

        // Check if the storage path is valid
        if (!doc.storage_path) {
          console.warn(`Missing storage path for document: ${doc.filename}. Skipping.`);
          continue;
        }

        // Ensure the file is downloaded from Supabase Storage
        console.log(`Attempting to download file from Supabase Storage: ${doc.storage_path}`);
        const { data: fileData, error: downloadError } = await supabase
          .storage
          .from('document') // Ensure this matches your bucket name
          .download(doc.storage_path);

        if (downloadError) {
          console.warn(`Failed to download file from Supabase Storage: ${downloadError.message}`);
          continue;
        }

        // Convert the file data to a buffer
        const fileBuffer = Buffer.from(await fileData.arrayBuffer());

        // Log the success of the file download
        console.log(`Successfully downloaded file: ${doc.filename} from path: ${doc.storage_path}`);
        console.log(`Downloaded file size: ${fileBuffer.length} bytes`);

        // Pass the file buffer to the content extractor
        const { text, metadata, chunks } = await contentExtractors.extractContent(fileBuffer, doc.file_type);

        if (!text) {
          console.warn(`No text extracted for document: ${doc.filename}`);
          continue;
        }

        // Process and chunk text
        const processedChunks = textProcessing.chunkText(text);

        // Generate embeddings
        const chunksWithEmbeddings = await embeddings.generateEmbeddings(processedChunks);

        // Store chunks in the database
        for (let i = 0; i < chunksWithEmbeddings.length; i++) {
          const chunk = chunksWithEmbeddings[i];
          await supabase.from('document_chunks').insert({
            document_id: doc.id,
            chunk_index: i,
            content: chunk.text,
            embedding: chunk.embedding,
          });
        }

        console.log(`Successfully processed document: ${doc.filename}`);
      } catch (err) {
        console.error(`Error processing document ${doc.filename}:`, err.message);
      }
    }
  } catch (err) {
    console.error('Unexpected error:', err.message);
  }
}

processDocuments();