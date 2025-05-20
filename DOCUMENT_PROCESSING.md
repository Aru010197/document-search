# Document Processing Guide

This guide explains how to make your documents searchable in the Document Search Application after they've been uploaded to Supabase storage.

## Overview

For documents to be searchable, two things need to happen:

1. **Database Entries**: Each document needs an entry in the `documents` table
2. **Content Extraction**: The text content needs to be extracted, split into chunks, and stored with embeddings in the `document_chunks` table

We've provided two scripts to help with this process:

- `create_document_entries.js`: Creates database entries for files in Supabase storage
- `process_documents.js`: Extracts text from documents and creates searchable chunks with embeddings

## Prerequisites

1. Make sure you have Node.js installed (version 14 or higher)
2. Install the required dependencies:

```bash
# Install dependencies directly
cd document-search-app
npm install dotenv @supabase/supabase-js uuid pdf-parse mammoth openai @tensorflow/tfjs-node @tensorflow-models/universal-sentence-encoder
```

Or install dependencies manually:

```bash
npm install dotenv @supabase/supabase-js uuid pdf-parse mammoth openai @tensorflow/tfjs-node @tensorflow-models/universal-sentence-encoder
```

3. Ensure your `.env.local` file has the correct Supabase credentials:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_EMBEDDING_PROVIDER` (set to 'sbert' or 'openai')
   - `OPENAI_API_KEY` (if using 'openai' as the embedding provider)

4. Make sure the database tables are created by running the SQL in `supabase/schema.sql`

## Step 1: Create Database Entries

If you've manually uploaded files to the Supabase storage bucket, you need to create corresponding entries in the `documents` table:

```bash
node create_document_entries.js
```

This script will:
- List all files in the 'documents' storage bucket
- Check which files already have database entries
- Create new entries for files that don't have them

## Step 2: Process Documents

After creating database entries, you need to process the documents to extract text and create searchable chunks:

```bash
node process_documents.js
```

This script will:
- Find documents that have entries but haven't been processed yet
- Download each document from Supabase storage
- Extract text content based on file type (currently supports PDF and DOCX)
- Split the text into overlapping chunks
- Generate embeddings for each chunk using the configured provider (SBERT or OpenAI)
- Store the chunks and embeddings in the `document_chunks` table

## Step 3: Search for Documents

Once you've processed your documents, you can search for them in the application:

1. Start the application:
   ```bash
   npm run dev
   ```

2. Access the application at http://localhost:3018

3. Use the search functionality to find your documents

## Troubleshooting

### No Documents Showing in Search Results

If you've uploaded documents but they're not appearing in search results, check the following:

1. **Database Tables**: Make sure the `documents` and `document_chunks` tables exist
   - Run the SQL in `supabase/schema.sql` if they don't

2. **Document Entries**: Check if your documents have entries in the `documents` table
   - Run `node create_document_entries.js` to create missing entries

3. **Document Chunks**: Check if your documents have been processed into chunks
   - Run `node process_documents.js` to process documents that haven't been chunked

4. **Embedding Provider**: Make sure the embedding provider is correctly configured
   - For SBERT (default): No additional configuration needed
   - For OpenAI: Make sure `OPENAI_API_KEY` is set in `.env.local`

### Error: "The documents table does not exist"

If you see this error, you need to run the SQL script to create the database tables:

1. Go to your Supabase project dashboard
2. Open the SQL Editor
3. Copy and paste the contents of `supabase/schema.sql`
4. Run the SQL

### Error: "Error downloading file"

This usually means the file path in the database doesn't match the actual path in storage, or the file doesn't exist in storage. Check:

1. The `storage_path` column in the `documents` table
2. The actual file path in the Supabase storage bucket

## Supported File Types

Currently, the processing script supports:
- PDF files (`.pdf`)
- Word documents (`.docx`)

Support for other file types can be added by extending the text extraction logic in `process_documents.js`.

## Embedding Providers

The application supports two embedding providers:

1. **SBERT (Universal Sentence Encoder)** - Default
   - Runs locally using TensorFlow.js
   - No API key required
   - 512-dimensional vectors

2. **OpenAI**
   - Requires an OpenAI API key
   - 1536-dimensional vectors
   - Generally provides better semantic search results

To switch providers, change the `NEXT_PUBLIC_EMBEDDING_PROVIDER` in `.env.local` to either 'sbert' or 'openai'.
