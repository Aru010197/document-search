/**
 * Re-process Documents Script
 * 
 * This script re-processes all documents in the database to update their embeddings
 * to use 512-dimensional vectors instead of 1536-dimensional vectors.
 * 
 * Usage:
 * node reprocess-documents.js
 */

const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

async function installDependencies() {
  console.log('Installing required dependencies...');
  
  try {
    // Install natural language processing libraries
    console.log('Installing natural language processing libraries...');
    await execAsync('npm install natural compromise wink-nlp wink-eng-lite-web-model --no-save');
    
    // Install TensorFlow.js and Universal Sentence Encoder
    console.log('Installing TensorFlow.js and Universal Sentence Encoder...');
    await execAsync('npm install @tensorflow/tfjs-node @tensorflow-models/universal-sentence-encoder --no-save');
    
    // Install document processing libraries
    console.log('Installing document processing libraries...');
    await execAsync('npm install pdf-parse mammoth jszip xml2js xlsx --no-save');
    
    // Install Supabase client
    console.log('Installing Supabase client...');
    await execAsync('npm install @supabase/supabase-js --no-save');
    
    console.log('All dependencies installed successfully.');
    return true;
  } catch (error) {
    console.error('Error installing dependencies:', error);
    return false;
  }
}

async function main() {
  console.log('Starting document re-processing...');
  console.log('This script will re-process all documents in the database to update their embeddings to use 512-dimensional vectors.');
  
  // Install dependencies first
  const dependenciesInstalled = await installDependencies();
  
  if (!dependenciesInstalled) {
    console.error('Failed to install dependencies. Please install them manually and try again.');
    return;
  }
  
  console.log('The process may take some time depending on the number and size of documents.');
  console.log('Please wait until the process is complete...');
  
  // Import the process_documents.js script
  try {
    require('./process_documents');
  } catch (error) {
    console.error('Error running process_documents.js:', error);
  }
}

// Run the main function
main().catch(console.error);
