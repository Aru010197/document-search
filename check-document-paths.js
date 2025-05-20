/**
 * Check Document Paths Script
 * 
 * This script checks the storage paths in the documents table and compares them
 * with the files in the storage bucket to identify any mismatches.
 * 
 * Usage:
 * node check-document-paths.js
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

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
 * Main function to check document paths
 */
async function checkDocumentPaths() {
  try {
    console.log('Checking document paths...');
    
    // Fetch all documents from the database
    console.log('Fetching documents from database...');
    const { data: documents, error: documentsError } = await supabase
      .from('documents')
      .select('id, filename, storage_path');
    
    if (documentsError) {
      console.error('Error fetching documents:', documentsError);
      return;
    }
    
    if (!documents || documents.length === 0) {
      console.log('No documents found in the database.');
      return;
    }
    
    console.log(`Found ${documents.length} documents in the database.`);
    
    // Fetch all files from the storage bucket
    console.log('Fetching files from storage bucket...');
    const { data: files, error: filesError } = await supabase
      .storage
      .from('document')
      .list();
    
    if (filesError) {
      console.error('Error fetching files from storage bucket:', filesError);
      return;
    }
    
    if (!files || files.length === 0) {
      console.log('No files found in the storage bucket.');
      return;
    }
    
    console.log(`Found ${files.length} files in the storage bucket.`);
    
    // Create a set of file names in the storage bucket
    const fileNames = new Set(files.map(file => file.name));
    
    // Check each document's storage path
    console.log('\nChecking document storage paths...');
    let missingFiles = 0;
    let validFiles = 0;
    
    for (const doc of documents) {
      const storagePath = doc.storage_path || doc.filename;
      
      if (fileNames.has(storagePath)) {
        console.log(`✅ Document ${doc.id} (${doc.filename}): Storage path "${storagePath}" exists in bucket.`);
        validFiles++;
        
        // Try to generate a signed URL for the file
        try {
          const { data: urlData, error: urlError } = await supabase
            .storage
            .from('document')
            .createSignedUrl(storagePath, 60); // 1 minute expiry
          
          if (urlError) {
            console.error(`❌ Error generating signed URL for ${storagePath}:`, urlError);
          } else if (urlData?.signedUrl) {
            console.log(`✅ Successfully generated signed URL for ${storagePath}`);
          } else {
            console.error(`❌ No signed URL generated for ${storagePath}`);
          }
        } catch (error) {
          console.error(`❌ Error testing signed URL for ${storagePath}:`, error);
        }
      } else {
        console.error(`❌ Document ${doc.id} (${doc.filename}): Storage path "${storagePath}" NOT FOUND in bucket.`);
        missingFiles++;
        
        // Update the document with the correct storage path if the filename exists in the bucket
        if (fileNames.has(doc.filename)) {
          console.log(`🔄 Attempting to update storage_path for document ${doc.id} to "${doc.filename}"...`);
          
          const { error: updateError } = await supabase
            .from('documents')
            .update({ storage_path: doc.filename })
            .eq('id', doc.id);
          
          if (updateError) {
            console.error(`❌ Error updating storage_path for document ${doc.id}:`, updateError);
          } else {
            console.log(`✅ Successfully updated storage_path for document ${doc.id} to "${doc.filename}".`);
          }
        }
      }
    }
    
    console.log('\nSummary:');
    console.log(`Total documents: ${documents.length}`);
    console.log(`Valid storage paths: ${validFiles}`);
    console.log(`Missing files: ${missingFiles}`);
    
    // List files in the bucket that don't have corresponding document entries
    const documentPaths = new Set(documents.map(doc => doc.storage_path || doc.filename));
    const orphanedFiles = files.filter(file => !documentPaths.has(file.name));
    
    console.log(`\nOrphaned files in bucket (no corresponding document entry): ${orphanedFiles.length}`);
    orphanedFiles.forEach(file => {
      console.log(`- ${file.name}`);
    });
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Run the script
checkDocumentPaths();
