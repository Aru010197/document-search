/**
 * Create Document Entries Script
 * 
 * This script helps create database entries for files that have been manually uploaded
 * to the Supabase storage bucket. It lists all files in the 'documents' bucket and
 * creates corresponding entries in the 'documents' table.
 * 
 * Usage:
 * node create_document_entries.js
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

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
 * Get file type from filename
 */
function getFileType(filename) {
  const ext = path.extname(filename).toLowerCase().substring(1);
  
  // Map extensions to standardized types
  if (ext === 'pdf') {
    return 'pdf';
  } else if (ext === 'doc' || ext === 'docx') {
    return 'docx';
  } else if (ext === 'ppt' || ext === 'pptx') {
    return 'pptx';
  } else if (ext === 'xls' || ext === 'xlsx') {
    return 'xlsx';
  } else {
    return ext;
  }
}

/**
 * Create document entries for files in the storage bucket
 */
async function createDocumentEntries() {
  try {
    console.log('Listing files in the "documents" bucket...');
    
    // List all files in the documents bucket
    const { data: files, error: listError } = await supabase
      .storage
      .from('documents')
      .list();
    
    if (listError) {
      console.error('Error listing files:', listError.message);
      return;
    }
    
    if (!files || files.length === 0) {
      console.log('No files found in the "documents" bucket.');
      return;
    }
    
    console.log(`Found ${files.length} files in the bucket.`);
    
    // Check if the documents table exists
    console.log('Checking if the "documents" table exists...');
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
      .select('storage_path');
    
    if (fetchError) {
      console.error('Error fetching existing documents:', fetchError.message);
      return;
    }
    
    const existingPaths = new Set(existingDocs.map(doc => doc.storage_path));
    
    // Process each file
    let createdCount = 0;
    let skippedCount = 0;
    
    for (const file of files) {
      // Skip folders
      if (file.id.endsWith('/')) {
        continue;
      }
      
      // Check if this file already has an entry
      const storagePath = file.name;
      
      if (existingPaths.has(storagePath)) {
        console.log(`Skipping ${file.name} - entry already exists`);
        skippedCount++;
        continue;
      }
      
      // Get file metadata
      const { data: fileData } = await supabase
        .storage
        .from('documents')
        .getPublicUrl(file.name);
      
      const publicUrl = fileData.publicUrl;
      
      // Create a document entry
      const documentId = uuidv4();
      const filename = path.basename(file.name);
      const filetype = getFileType(filename);
      const filesize = file.metadata?.size || 0;
      const now = new Date().toISOString();
      
      const { error: insertError } = await supabase
        .from('documents')
        .insert({
          id: documentId,
          filename: filename,
          filetype: filetype,
          filesize: filesize,
          storage_path: storagePath,
          title: filename,
          upload_date: now,
          last_modified: now,
          metadata: {
            title: filename,
            upload_date: now,
            source_url: publicUrl,
            file_type: filetype
          }
        });
      
      if (insertError) {
        console.error(`Error creating entry for ${filename}:`, insertError.message);
      } else {
        console.log(`Created entry for ${filename} (ID: ${documentId})`);
        createdCount++;
      }
    }
    
    console.log('\nSummary:');
    console.log(`Total files processed: ${files.length}`);
    console.log(`Entries created: ${createdCount}`);
    console.log(`Files skipped (already have entries): ${skippedCount}`);
    
    if (createdCount > 0) {
      console.log('\nNext steps:');
      console.log('1. Process the documents to extract content and create chunks:');
      console.log('   - Use the application\'s upload processing functionality');
      console.log('   - Or implement a script to extract text and create chunks with embeddings');
      console.log('2. Try searching for documents in the application');
    }
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Run the script
createDocumentEntries();
