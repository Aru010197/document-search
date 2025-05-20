/**
 * Setup Database Script
 * 
 * This script sets up the database schema by running the schema.sql file.
 * 
 * Usage:
 * node setup-database.js
 */

// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

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
 * Setup the database schema
 */
async function setupDatabase() {
  try {
    console.log('Setting up database schema...');
    
    // Read the schema.sql file
    const schemaPath = path.join(__dirname, 'supabase', 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    
    // Split the SQL into individual statements
    const statements = schemaSql
      .split(';')
      .map(statement => statement.trim())
      .filter(statement => statement.length > 0);
    
    console.log(`Found ${statements.length} SQL statements in schema.sql`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`Executing statement ${i + 1}/${statements.length}...`);
      
      try {
        const { error } = await supabase.rpc('exec_sql', { sql: statement });
        
        if (error) {
          console.error(`Error executing statement ${i + 1}:`, error.message);
          console.log('Statement:', statement);
        } else {
          console.log(`Statement ${i + 1} executed successfully.`);
        }
      } catch (statementError) {
        console.error(`Error executing statement ${i + 1}:`, statementError.message);
        console.log('Statement:', statement);
        
        // Try an alternative approach for this statement
        console.log('Trying alternative approach...');
        
        try {
          // For CREATE EXTENSION statements
          if (statement.toLowerCase().includes('create extension')) {
            console.log('This is a CREATE EXTENSION statement. Skipping as it requires superuser privileges.');
            continue;
          }
          
          // For CREATE TABLE statements
          if (statement.toLowerCase().includes('create table')) {
            const tableName = statement.match(/create\s+table\s+(?:if\s+not\s+exists\s+)?(\w+)/i);
            if (tableName && tableName[1]) {
              console.log(`Checking if table ${tableName[1]} exists...`);
              
              const { data, error: checkError } = await supabase
                .from(tableName[1])
                .select('*')
                .limit(1);
              
              if (checkError) {
                console.log(`Table ${tableName[1]} does not exist or is not accessible.`);
              } else {
                console.log(`Table ${tableName[1]} already exists.`);
              }
            }
          }
          
          // For CREATE INDEX statements
          if (statement.toLowerCase().includes('create index')) {
            console.log('This is a CREATE INDEX statement. Skipping as it might require special privileges.');
            continue;
          }
          
          // For CREATE FUNCTION statements
          if (statement.toLowerCase().includes('create function') || statement.toLowerCase().includes('create or replace function')) {
            console.log('This is a CREATE FUNCTION statement. Skipping as it might require special privileges.');
            continue;
          }
          
          // For ALTER TABLE statements
          if (statement.toLowerCase().includes('alter table')) {
            console.log('This is an ALTER TABLE statement. Skipping as it might require special privileges.');
            continue;
          }
          
          // For CREATE POLICY statements
          if (statement.toLowerCase().includes('create policy')) {
            console.log('This is a CREATE POLICY statement. Skipping as it might require special privileges.');
            continue;
          }
        } catch (alternativeError) {
          console.error('Error in alternative approach:', alternativeError.message);
        }
      }
    }
    
    console.log('\nDatabase schema setup complete.');
    
    // Check if the tables were created
    console.log('\nChecking if tables were created...');
    
    // Check documents table
    const { data: docCheck, error: docCheckError } = await supabase
      .from('documents')
      .select('id')
      .limit(1);
    
    if (docCheckError) {
      console.error('Error: The "documents" table does not exist or is not accessible.');
      console.error('Error details:', docCheckError.message);
    } else {
      console.log('The "documents" table exists.');
    }
    
    // Check document_chunks table
    const { data: chunkCheck, error: chunkCheckError } = await supabase
      .from('document_chunks')
      .select('id')
      .limit(1);
    
    if (chunkCheckError) {
      console.error('Error: The "document_chunks" table does not exist or is not accessible.');
      console.error('Error details:', chunkCheckError.message);
    } else {
      console.log('The "document_chunks" table exists.');
    }
    
    // Create storage bucket if it doesn't exist
    console.log('\nChecking if the "documents" storage bucket exists...');
    
    const { data: buckets, error: bucketsError } = await supabase
      .storage
      .listBuckets();
    
    if (bucketsError) {
      console.error('Error listing storage buckets:', bucketsError.message);
    } else {
      const documentsBucket = buckets.find(bucket => bucket.name === 'documents');
      
      if (!documentsBucket) {
        console.log('The "documents" bucket does not exist. Creating it...');
        
        const { data: newBucket, error: createError } = await supabase
          .storage
          .createBucket('documents', {
            public: false,
            fileSizeLimit: 52428800, // 50MB
          });
        
        if (createError) {
          console.error('Error creating "documents" bucket:', createError.message);
        } else {
          console.log('The "documents" bucket was created successfully.');
        }
      } else {
        console.log('The "documents" bucket already exists.');
      }
    }
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Run the script
setupDatabase();
