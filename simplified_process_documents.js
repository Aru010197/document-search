/**
 * Simplified Document Processing Script
 * 
 * This script processes documents from the Supabase 'document' bucket
 * without using the pdf-parse module.
 */

require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Function to split text into chunks
function splitIntoChunks(text, chunkSize = 500, overlapSize = 100) {
  if (!text || text.length === 0) return [];
  
  const words = text.split(/\s+/);
  const chunks = [];
  
  for (let i = 0; i < words.length; i += chunkSize - overlapSize) {
    const chunk = words.slice(i, i + chunkSize).join(' ');
    if (chunk.trim().length > 0) {
      chunks.push(chunk);
    }
  }
  
  return chunks;
}

// Simple text extraction function for documents
async function extractTextFromDocument(filename, fileBuffer) {
  console.log(`Extracting text from ${filename}`);
  
  // For simplicity, just return a sample text
  return `This is a sample text extracted from ${filename}. 
  This document contains information about cloud kitchens and decks related to 
  business operations. Cloud kitchens are commercial facilities purpose-built to 
  produce food specifically for delivery. These commissary kitchens are sometimes 
  also known as ghost kitchens, shared kitchens, or virtual kitchens with the 
  delivery-only food brands operating within them called virtual restaurants.`;
}

async function processDocuments() {
  try {
    console.log('Starting simplified document processing...');
    
    // List files in the 'document' bucket
    const { data: files, error: listError } = await supabase.storage
      .from('document')
      .list();
    
    if (listError) {
      console.error('Error listing files:', listError);
      return;
    }
    
    console.log(`Found ${files.length} files in storage bucket:`);
    files.forEach(file => console.log(`- ${file.name}`));
    
    // Process each file in the bucket
    for (const file of files) {
      try {
        console.log(`Processing file: ${file.name}`);
        
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
        
        // Extract text content
        const textContent = await extractTextFromDocument(file.name);
        
        // Split into chunks
        const chunks = splitIntoChunks(textContent);
        console.log(`Created ${chunks.length} chunks for document ${documentId}`);
        
        // Store chunks directly without embeddings for now
        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i];
          
          const { error: chunkError } = await supabase
            .from('document_chunk_embeddings')
            .insert({
              document_id: documentId,
              chunk_index: i,
              chunk_text: chunk,
              // Use a dummy embedding for testing purposes
              embedding: Array(1536).fill(0).map(() => Math.random() * 2 - 1)
            });
          
          if (chunkError) {
            console.error(`Error storing chunk ${i}:`, chunkError);
          } else {
            console.log(`Stored chunk ${i} successfully`);
          }
        }
        
        // Update document status
        const { error: updateError } = await supabase
          .from('documents')
          .update({
            text_content: textContent,
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
    
    console.log('Document processing completed!');
  } catch (error) {
    console.error('Error in processing script:', error);
  }
}

processDocuments();