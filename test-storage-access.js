/**
 * Test Storage Access Script
 * 
 * This script tests if we can access files in the Supabase storage bucket
 * and generate signed URLs for them.
 * 
 * Usage:
 * node test-storage-access.js
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
 * Main function to test storage access
 */
async function testStorageAccess() {
  try {
    console.log('Testing storage access...');
    
    // List all buckets
    console.log('Listing all storage buckets...');
    const { data: buckets, error: bucketsError } = await supabase
      .storage
      .listBuckets();
    
    if (bucketsError) {
      console.error('Error listing buckets:', bucketsError);
      return;
    }
    
    console.log('Available buckets:');
    buckets.forEach(bucket => {
      console.log(`- ${bucket.name} (${bucket.id})`);
    });
    
    // List files in the 'document' bucket
    console.log('\nListing files in the "document" bucket...');
    const { data: files, error: filesError } = await supabase
      .storage
      .from('document')
      .list();
    
    if (filesError) {
      console.error('Error listing files:', filesError);
      return;
    }
    
    if (!files || files.length === 0) {
      console.log('No files found in the "document" bucket.');
      return;
    }
    
    console.log(`Found ${files.length} files in the "document" bucket:`);
    files.forEach(file => {
      console.log(`- ${file.name} (${file.id})`);
    });
    
    // Try to generate a signed URL for each file
    console.log('\nTesting signed URL generation for each file...');
    
    for (const file of files) {
      console.log(`\nTesting file: ${file.name}`);
      
      try {
        const { data: urlData, error: urlError } = await supabase
          .storage
          .from('document')
          .createSignedUrl(file.name, 60); // 1 minute expiry
        
        if (urlError) {
          console.error(`❌ Error generating signed URL for ${file.name}:`, urlError);
        } else if (urlData?.signedUrl) {
          console.log(`✅ Successfully generated signed URL for ${file.name}`);
          console.log(`URL: ${urlData.signedUrl}`);
          
          // Test if the URL is accessible
          console.log('Testing URL accessibility...');
          try {
            const response = await fetch(urlData.signedUrl, { method: 'HEAD' });
            if (response.ok) {
              console.log(`✅ URL is accessible (Status: ${response.status})`);
            } else {
              console.error(`❌ URL is not accessible (Status: ${response.status})`);
            }
          } catch (fetchError) {
            console.error(`❌ Error testing URL accessibility:`, fetchError);
          }
        } else {
          console.error(`❌ No signed URL generated for ${file.name}`);
        }
      } catch (error) {
        console.error(`❌ Error testing signed URL for ${file.name}:`, error);
      }
    }
    
    // Test downloading a file
    if (files.length > 0) {
      const testFile = files[0];
      console.log(`\nTesting download for file: ${testFile.name}`);
      
      try {
        const { data: fileData, error: downloadError } = await supabase
          .storage
          .from('document')
          .download(testFile.name);
        
        if (downloadError) {
          console.error(`❌ Error downloading file: ${downloadError.message}`);
        } else if (fileData) {
          console.log(`✅ Successfully downloaded file (${fileData.size} bytes)`);
        } else {
          console.error(`❌ No file data received`);
        }
      } catch (error) {
        console.error(`❌ Error testing download:`, error);
      }
    }
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Run the script
testStorageAccess();
