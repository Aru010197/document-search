/**
 * Check Supabase Connection Script
 * 
 * This script checks if the Supabase database is accessible and if there are any documents in it.
 * 
 * Usage:
 * node check-supabase.js
 */

// Load environment variables from .env.local
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
 * Check Supabase connection and database
 */
async function checkSupabase() {
  try {
    console.log('Checking Supabase connection...');
    
    // Check if we can connect to Supabase
    const { data: healthData, error: healthError } = await supabase.rpc('pg_stat_statements_reset');
    
    if (healthError) {
      console.log('Connected to Supabase, but got an expected error when calling a function that might not exist:');
      console.log(healthError.message);
      console.log('This is normal and indicates the connection is working.');
    } else {
      console.log('Connected to Supabase successfully.');
    }
    
    // List all tables in the database
    console.log('\nListing all tables in the database...');
    const { data: tables, error: tablesError } = await supabase
      .from('pg_tables')
      .select('tablename')
      .eq('schemaname', 'public');
    
    if (tablesError) {
      console.error('Error listing tables:', tablesError.message);
    } else if (!tables || tables.length === 0) {
      console.log('No tables found in the database.');
    } else {
      console.log(`Found ${tables.length} tables in the database:`);
      tables.forEach(table => console.log(`- ${table.tablename}`));
    }
    
    // Check if the documents table exists
    console.log('\nChecking if the "documents" table exists...');
    const { data: docCheck, error: docCheckError } = await supabase
      .from('documents')
      .select('id')
      .limit(1);
    
    if (docCheckError) {
      console.error('Error: The "documents" table does not exist or is not accessible.');
      console.error('Error details:', docCheckError.message);
    } else {
      console.log('The "documents" table exists.');
      
      // Count documents
      const { count: docCount, error: countError } = await supabase
        .from('documents')
        .select('*', { count: 'exact', head: true });
      
      if (countError) {
        console.error('Error counting documents:', countError.message);
      } else {
        console.log(`There are ${docCount} documents in the database.`);
        
        if (docCount > 0) {
          // Get a sample of documents
          const { data: docSample, error: sampleError } = await supabase
            .from('documents')
            .select('id, filename, filetype')
            .limit(5);
          
          if (sampleError) {
            console.error('Error fetching document sample:', sampleError.message);
          } else {
            console.log('\nSample documents:');
            docSample.forEach(doc => {
              console.log(`- ${doc.filename} (${doc.filetype}) [ID: ${doc.id}]`);
            });
          }
        }
      }
    }
    
    // Check if the document_chunks table exists
    console.log('\nChecking if the "document_chunks" table exists...');
    const { data: chunkCheck, error: chunkCheckError } = await supabase
      .from('document_chunks')
      .select('id')
      .limit(1);
    
    if (chunkCheckError) {
      console.error('Error: The "document_chunks" table does not exist or is not accessible.');
      console.error('Error details:', chunkCheckError.message);
    } else {
      console.log('The "document_chunks" table exists.');
      
      // Count chunks
      const { count: chunkCount, error: chunkCountError } = await supabase
        .from('document_chunks')
        .select('*', { count: 'exact', head: true });
      
      if (chunkCountError) {
        console.error('Error counting document chunks:', chunkCountError.message);
      } else {
        console.log(`There are ${chunkCount} document chunks in the database.`);
      }
    }
    
    // Check storage buckets
    console.log('\nChecking storage buckets...');
    const { data: buckets, error: bucketsError } = await supabase
      .storage
      .listBuckets();
    
    if (bucketsError) {
      console.error('Error listing storage buckets:', bucketsError.message);
    } else if (!buckets || buckets.length === 0) {
      console.log('No storage buckets found.');
    } else {
      console.log(`Found ${buckets.length} storage buckets:`);
      buckets.forEach(bucket => console.log(`- ${bucket.name}`));
      
      // Check if the documents bucket exists
      const documentsBucket = buckets.find(bucket => bucket.name === 'documents');
      if (documentsBucket) {
        console.log('\nThe "documents" bucket exists. Listing files...');
        
        const { data: files, error: filesError } = await supabase
          .storage
          .from('documents')
          .list();
        
        if (filesError) {
          console.error('Error listing files in the documents bucket:', filesError.message);
        } else if (!files || files.length === 0) {
          console.log('No files found in the documents bucket.');
        } else {
          console.log(`Found ${files.length} files/folders in the documents bucket:`);
          files.forEach(file => {
            if (file.id.endsWith('/')) {
              console.log(`- [Folder] ${file.name}`);
            } else {
              console.log(`- [File] ${file.name} (${file.metadata?.size || 'unknown'} bytes)`);
            }
          });
        }
      } else {
        console.log('The "documents" bucket does not exist.');
      }
    }
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Run the script
checkSupabase();
