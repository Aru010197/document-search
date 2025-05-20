// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Get values from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Key exists:', !!supabaseKey);

try {
  console.log('Creating Supabase client...');
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  console.log('Supabase client created successfully.');
  
  // Test a simple query
  async function testQuery() {
    try {
      console.log('Testing a simple query...');
      const { data, error } = await supabase.from('documents').select('count');
      
      if (error) {
        console.error('Error executing query:', error);
      } else {
        console.log('Query executed successfully. Result:', data);
      }
    } catch (error) {
      console.error('Error in test query:', error);
    }
  }
  
  testQuery();
} catch (error) {
  console.error('Error creating Supabase client:', error);
}
