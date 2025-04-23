import { IncomingForm } from 'formidable';
import { extractContent, generateEmbeddings } from '../../lib/content-extractors';
import { enrichMetadata } from '../../lib/metadata-extractors';
import { getServerSupabase } from '../../lib/supabase';
import { v4 as uuidv4 } from 'uuid';

// Disable the default body parser
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parse the form data
    const form = new IncomingForm({
      keepExtensions: true,
      maxFileSize: 20 * 1024 * 1024, // 20MB limit
    });

    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        resolve([fields, files]);
      });
    });

    const file = files.file[0]; // Updated for formidable v3+
    
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Get file details
    const fileBuffer = await readFileAsBuffer(file.filepath);
    const fileType = file.originalFilename.split('.').pop().toLowerCase();
    const fileName = file.originalFilename;
    const fileSize = file.size;

    // Check if file type is supported
    const supportedTypes = ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx'];
    if (!supportedTypes.includes(fileType)) {
      return res.status(400).json({ 
        error: 'Unsupported file type. Supported types: PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX' 
      });
    }

    // Extract content from the document
    const { text, metadata: extractedMetadata, chunks } = await extractContent(fileBuffer, fileType);
    
    // Enrich metadata with keywords, summary, etc.
    const metadata = await enrichMetadata(extractedMetadata, text);

    // Generate embeddings for chunks
    const chunksWithEmbeddings = await generateEmbeddings(chunks);

    // Generate a unique ID for the document
    const documentId = uuidv4();

    // Get server-side Supabase client
    const supabase = getServerSupabase();
    
    // Store the original file in Supabase Storage
    const { data: storageData, error: storageError } = await supabase
      .storage
      .from('documents')
      .upload(`${documentId}/${fileName}`, fileBuffer, {
        contentType: file.mimetype,
        cacheControl: '3600',
      });

    if (storageError) {
      console.error('Storage error:', storageError);
      return res.status(500).json({ error: 'Failed to store document' });
    }

    // Store document metadata in the database
    const { data: documentData, error: documentError } = await supabase
      .from('documents')
      .insert({
        id: documentId,
        filename: fileName,
        filetype: fileType,
        filesize: fileSize,
        storage_path: storageData.path,
        title: metadata.title || fileName,
        author: metadata.author || null,
        upload_date: new Date().toISOString(),
        last_modified: metadata.modified_date || null,
        metadata: metadata,
      });

    if (documentError) {
      console.error('Database error:', documentError);
      return res.status(500).json({ error: 'Failed to store document metadata' });
    }

    // Store document chunks with embeddings
    const chunksToInsert = chunksWithEmbeddings.map((chunk, index) => ({
      document_id: documentId,
      chunk_index: index,
      content: chunk.content,
      embedding: chunk.embedding,
      metadata: chunk.metadata || {},
    }));

    // Insert chunks in batches to avoid payload size limits
    const BATCH_SIZE = 10;
    for (let i = 0; i < chunksToInsert.length; i += BATCH_SIZE) {
      const batch = chunksToInsert.slice(i, i + BATCH_SIZE);
      
      const { error: chunkError } = await supabase
        .from('document_chunks')
        .insert(batch);
      
      if (chunkError) {
        console.error('Chunk insertion error:', chunkError);
        return res.status(500).json({ error: 'Failed to store document chunks' });
      }
    }

    return res.status(200).json({
      success: true,
      documentId,
      message: 'Document uploaded and processed successfully',
      document: {
        id: documentId,
        filename: fileName,
        filetype: fileType,
        filesize: fileSize,
        title: metadata.title || fileName,
        author: metadata.author || null,
        upload_date: new Date().toISOString(),
        chunk_count: chunksWithEmbeddings.length,
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({ error: 'Failed to process document' });
  }
}

// Helper function to read file as buffer
async function readFileAsBuffer(filepath) {
  const fs = require('fs').promises;
  return await fs.readFile(filepath);
}
