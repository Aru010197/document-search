const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Read .env.local file directly
function readEnvFile() {
  try {
    const envPath = path.join(__dirname, '.env.local');
    const envContent = fs.readFileSync(envPath, 'utf8');
    const envVars = {};
    
    // Parse each line
    envContent.split('\n').forEach(line => {
      // Skip comments and empty lines
      if (line.startsWith('#') || !line.trim()) return;
      
      // Extract key and value
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim();
        envVars[key] = value;
      }
    });
    
    return envVars;
  } catch (error) {
    console.error('Error reading .env.local file:', error);
    return {};
  }
}

// Main function
async function main() {
  const env = readEnvFile();
  
  console.log('Environment variables found:');
  console.log('NEXT_PUBLIC_SUPABASE_URL exists:', !!env.NEXT_PUBLIC_SUPABASE_URL);
  console.log('SUPABASE_SERVICE_ROLE_KEY exists:', !!env.SUPABASE_SERVICE_ROLE_KEY);
  
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing required Supabase environment variables in .env.local file.');
    console.log('Please make sure your .env.local file contains:');
    console.log('NEXT_PUBLIC_SUPABASE_URL=your-supabase-url');
    console.log('SUPABASE_SERVICE_ROLE_KEY=your-service-role-key');
    return;
  }
  
  console.log('Supabase URL:', env.NEXT_PUBLIC_SUPABASE_URL);
  
  try {
    // Create Supabase client
    console.log('Creating Supabase client...');
    const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
    
    // Test connection
    console.log('Testing connection...');
    const { data, error } = await supabase.from('documents').select('count');
    
    if (error) {
      console.error('Error connecting to Supabase:', error);
      console.log('The documents table might not exist. You need to run the SQL script in supabase/schema.sql.');
    } else {
      console.log('Successfully connected to Supabase!');
      console.log('Documents table exists and is accessible.');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
