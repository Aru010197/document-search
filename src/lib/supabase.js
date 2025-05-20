import { createClient } from '@supabase/supabase-js';

// Initialize the Supabase client with environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Please check your .env.local file.');
}

// Create a single supabase client for the browser
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
  },
});

// For server-side operations (in API routes)
export const getServerSupabase = () => {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
    },
  });
};

/**
 * Fetch a file from the Supabase storage bucket.
 * @param {string} bucketName - The name of the storage bucket.
 * @param {string} filePath - The path to the file in the bucket.
 * @returns {Promise<Blob>} - The file as a Blob.
 */
export async function fetchFileFromBucket(bucketName, filePath) {
  const { data, error } = await supabase.storage.from(bucketName).download(filePath);

  if (error) {
    console.error('Error fetching file from bucket:', error);
    throw error;
  }

  return data;
}
