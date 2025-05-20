/**
 * Upload Sample Documents Script
 * 
 * This script creates sample document entries in the database with dummy content
 * for testing purposes.
 * 
 * Usage:
 * node upload-sample-documents.js
 */

const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { promisify } = require('util');
const writeFileAsync = promisify(fs.writeFile);
const unlinkAsync = promisify(fs.unlink);
const mkdirAsync = promisify(fs.mkdir);

// Initialize Supabase client with hardcoded values for testing
const supabaseUrl = 'https://eqfrecprcpiogptrmjxw.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxZnJlY3ByY3Bpb2dwdHJtanh3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NTQxNTk0NywiZXhwIjoyMDYwOTkxOTQ3fQ.cHP9L-aw_RmefnPQEX8k7ovDwyJYpbdw-pQEmhV_1ns';

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

// Sample documents to create
const sampleDocuments = [
  {
    filename: 'Beauty & Personal Care.pptx',
    filetype: 'pptx',
    content: 'Beauty and Personal Care industry overview. This presentation covers market trends, consumer behavior, and growth opportunities in the beauty and personal care sector.'
  },
  {
    filename: 'Automobile Industry.pptx',
    filetype: 'pptx',
    content: 'Automobile Industry analysis and market overview. This presentation examines the current state and future trends of the global automotive sector.'
  },
  {
    filename: 'Data Center _ EMB.pptx',
    filetype: 'pptx',
    content: 'Data Center industry overview and EMB (Emerging Markets Business) strategy. This presentation covers data center infrastructure, operations, and growth opportunities.'
  },
  {
    filename: 'EMB __ CTO Deck.pptx',
    filetype: 'pptx',
    content: 'EMB (Emerging Markets Business) strategy presentation for the CTO office. This deck outlines technology initiatives and digital transformation in emerging markets.'
  },
  {
    filename: 'HealthTech x EMB.pptx',
    filetype: 'pptx',
    content: 'HealthTech and EMB (Emerging Markets Business) collaboration strategy. This presentation explores digital health solutions for emerging markets.'
  },
  {
    filename: 'LMS.pptx',
    filetype: 'pptx',
    content: 'Learning Management System (LMS) implementation strategy. This presentation covers the selection, deployment, and optimization of enterprise learning platforms.'
  },
  {
    filename: 'Multi-vendor e-comm DECK.pptx',
    filetype: 'pptx',
    content: 'Multi-vendor e-commerce platform strategy. This presentation outlines the business model, technology requirements, and operational considerations for marketplace platforms.'
  },
  {
    filename: 'Real Estate, Engineering & Construction x EMB.pptx',
    filetype: 'pptx',
    content: 'Real Estate, Engineering & Construction industry overview and EMB (Emerging Markets Business) strategy. This presentation examines market trends and growth opportunities.'
  },
  {
    filename: 'Textile Industry.pptx',
    filetype: 'pptx',
    content: 'Textile Industry analysis and market overview. This presentation covers the global textile and apparel value chain, from fiber production to retail distribution.'
  }
];

/**
 * Create a dummy file with content
 */
async function createDummyFile(filename, content) {
  const tempDir = path.join(os.tmpdir(), 'document-search-app');
  try {
    await mkdirAsync(tempDir, { recursive: true });
  } catch (err) {
    if (err.code !== 'EEXIST') {
      console.error('Error creating temporary directory:', err);
      throw err;
    }
  }
  
  const filePath = path.join(tempDir, filename);
  await writeFileAsync(filePath, content);
  return filePath;
}

/**
 * Upload sample documents to Supabase
 */
async function uploadSampleDocuments() {
  try {
    console.log('Checking if the "documents" table exists...');
    
    // Check if the documents table exists
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
    
    console.log('The "documents" table exists. Checking for existing entries...');
    
    // Get existing document entries
    const { data: existingDocs, error: fetchError } = await supabase
      .from('documents')
      .select('filename');
    
    if (fetchError) {
      console.error('Error fetching existing documents:', fetchError.message);
      return;
    }
    
    const existingFilenames = new Set(existingDocs?.map(doc => doc.filename) || []);
    
    // Process each sample document
    let createdCount = 0;
    let skippedCount = 0;
    
    for (const doc of sampleDocuments) {
      // Skip if already exists
      if (existingFilenames.has(doc.filename)) {
        console.log(`Skipping ${doc.filename} - entry already exists`);
        skippedCount++;
        continue;
      }
      
      // Create a dummy file
      console.log(`Creating dummy file for ${doc.filename}...`);
      const filePath = await createDummyFile(doc.filename, doc.content);
      
      // Generate a UUID for the document
      const documentId = uuidv4();
      
      // Upload the file to Supabase storage
      console.log(`Uploading ${doc.filename} to Supabase storage...`);
      const storagePath = `${documentId}/${doc.filename}`;
      
      const { error: uploadError } = await supabase
        .storage
        .from('documents')
        .upload(storagePath, fs.createReadStream(filePath), {
          contentType: doc.filetype === 'pptx' ? 'application/vnd.openxmlformats-officedocument.presentationml.presentation' : 'application/octet-stream',
          upsert: true
        });
      
      if (uploadError) {
        console.error(`Error uploading ${doc.filename}:`, uploadError.message);
        continue;
      }
      
      // Get the public URL
      const { data: urlData } = await supabase
        .storage
        .from('documents')
        .getPublicUrl(storagePath);
      
      const publicUrl = urlData?.publicUrl || '';
      
      // Create a document entry
      console.log(`Creating database entry for ${doc.filename}...`);
      const now = new Date().toISOString();
      
      const { error: insertError } = await supabase
        .from('documents')
        .insert({
          id: documentId,
          filename: doc.filename,
          filetype: doc.filetype,
          filesize: Buffer.byteLength(doc.content),
          storage_path: storagePath,
          title: doc.filename,
          upload_date: now,
          last_modified: now,
          metadata: {
            title: doc.filename,
            upload_date: now,
            source_url: publicUrl,
            file_type: doc.filetype
          }
        });
      
      if (insertError) {
        console.error(`Error creating entry for ${doc.filename}:`, insertError.message);
      } else {
        console.log(`Created entry for ${doc.filename} (ID: ${documentId})`);
        createdCount++;
      }
      
      // Clean up the temporary file
      await unlinkAsync(filePath);
    }
    
    console.log('\nSummary:');
    console.log(`Total documents processed: ${sampleDocuments.length}`);
    console.log(`Documents created: ${createdCount}`);
    console.log(`Documents skipped (already exist): ${skippedCount}`);
    
    if (createdCount > 0) {
      console.log('\nNext steps:');
      console.log('1. Run the add-sample-chunks.js script to add sample chunks for these documents');
      console.log('2. Or run process_documents.js to process the documents and generate embeddings');
    }
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Run the script
uploadSampleDocuments();
