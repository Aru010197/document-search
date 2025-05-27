/**
 * Content extraction utilities for different document types.
 * 
 * This module provides functions to extract text and metadata from various
 * document formats (PDF, DOCX, PPTX, XLSX) for search indexing.
 */

import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import ExcelJS from 'exceljs';
import officeParser from 'officeparser';

/**
 * Extract content from a PDF file
 * @param {Buffer} fileBuffer - The PDF file buffer
 * @returns {Promise<{text: string, metadata: Object, chunks: Array}>} Extracted text, metadata, and content chunks
 */
export async function extractPdfContent(fileBuffer) {
  try {
    const data = await pdfParse(fileBuffer);
    
    // Extract text content
    const text = data.text;
    
    // Extract metadata
    const metadata = {
      title: data.info?.Title || null,
      author: data.info?.Author || null,
      created_date: data.info?.CreationDate ? new Date(data.info.CreationDate).toISOString() : null,
      modified_date: data.info?.ModDate ? new Date(data.info.ModDate).toISOString() : null,
      page_count: data.numpages,
      content_type: 'pdf'
    };
    
    // Create content chunks (by paragraphs)
    const chunks = createContentChunks(text);
    
    return {
      text,
      metadata,
      chunks
    };
  } catch (error) {
    console.error('PDF extraction error:', error);
    throw new Error('Failed to extract content from PDF');
  }
}

/**
 * Extract content from a DOCX file
 * @param {Buffer} fileBuffer - The DOCX file buffer
 * @returns {Promise<{text: string, metadata: Object, chunks: Array}>} Extracted text, metadata, and content chunks
 */
export async function extractDocxContent(fileBuffer) {
  try {
    const result = await mammoth.extractRawText({ buffer: fileBuffer });
    const text = result.value;

    // Attempt to get metadata using mammoth (limited) or a dedicated docx metadata library
    let title = null;
    let author = null;
    // mammoth.properties doesn't exist; metadata extraction for docx is more complex.
    // You might need a library like 'docxmeta' or parse the XML directly for properties.
    // For now, keeping it simple.

    const metadata = {
      title: title,
      author: author,
      created_date: null, // Placeholder
      modified_date: null, // Placeholder
      content_type: 'docx'
    };
    
    // Create content chunks
    const chunks = createContentChunks(text);
    
    return {
      text,
      metadata,
      chunks
    };
  } catch (error) {
    console.error('DOCX extraction error:', error);
    throw new Error('Failed to extract content from DOCX');
  }
}

/**
 * Extract content from a PPTX file
 * @param {Buffer} fileBuffer - The PPTX file buffer
 * @returns {Promise<{text: string, metadata: Object, chunks: Array}>} Extracted text, metadata, and content chunks
 */
export async function extractPptContent(fileBuffer) {
  try {
    // Use officeparser to extract text from PPTX
    const text = await officeParser.parse(fileBuffer);

    // Basic metadata (officeparser might provide more, needs investigation)
    const metadata = {
      title: null, // Placeholder - Investigate if officeparser provides title
      author: null, // Placeholder - Investigate if officeparser provides author
      created_date: null, // Placeholder
      modified_date: null, // Placeholder
      slide_count: null, // Placeholder - Investigate if officeparser provides slide count
      content_type: 'pptx'
    };

    // Create content chunks from the extracted text
    const chunks = createContentChunks(text);

    return {
      text,
      metadata,
      chunks
    };
  } catch (error) {
    console.error('PPTX extraction error using officeparser:', error);
    throw new Error('Failed to extract content from PPTX using officeparser');
  }
}

/**
 * Extract content from an XLSX file
 * @param {Buffer} fileBuffer - The XLSX file buffer
 * @returns {Promise<{text: string, metadata: Object, chunks: Array}>} Extracted text, metadata, and content chunks
 */
export async function extractXlsxContent(fileBuffer) {
  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(fileBuffer);
    
    // Extract text from all sheets
    let fullText = '';
    const sheetChunks = [];
    const sheetNames = [];
    
    workbook.eachSheet((worksheet, sheetId) => {
      const sheetName = worksheet.name;
      sheetNames.push(sheetName);
      let sheetText = '';
      
      // Process each row and cell
      worksheet.eachRow((row, rowNumber) => {
        row.eachCell((cell, colNumber) => {
          sheetText += `${cell.value || ''}\t`;
        });
        sheetText += '\n';
      });
      
      fullText += `Sheet: ${sheetName}\n${sheetText}\n\n`;
      
      // Add each sheet as a chunk
      sheetChunks.push({
        content: sheetText,
        metadata: {
          type: 'sheet',
          name: sheetName
        }
      });
    });
    
    const metadata = {
      title: workbook.properties.title || null,
      author: workbook.properties.creator || null,
      created_date: workbook.properties.created ? new Date(workbook.properties.created).toISOString() : null,
      modified_date: workbook.properties.modified ? new Date(workbook.properties.modified).toISOString() : null,
      sheet_count: sheetNames.length,
      sheet_names: sheetNames,
      content_type: 'xlsx'
    };
    
    return {
      text: fullText,
      metadata,
      chunks: sheetChunks
    };
  } catch (error) {
    console.error('XLSX extraction error:', error);
    throw new Error('Failed to extract content from XLSX');
  }
}

/**
 * Create content chunks from text
 * @param {string} text - The text to chunk
 * @returns {Array<{content: string, metadata: Object}>} Array of content chunks
 */
function createContentChunks(text) {
  // Split by paragraphs (double newlines)
  const paragraphs = text.split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(p => p.length > 0);
  
  // Create chunks with a maximum size
  const MAX_CHUNK_SIZE = 1000; // characters
  const chunks = [];
  
  let currentChunk = '';
  let currentChunkIndex = 0;
  
  for (const paragraph of paragraphs) {
    // If adding this paragraph would exceed the max size, create a new chunk
    if (currentChunk.length + paragraph.length > MAX_CHUNK_SIZE && currentChunk.length > 0) {
      chunks.push({
        content: currentChunk,
        metadata: { 
          type: 'text_chunk',
          index: currentChunkIndex
        }
      });
      currentChunk = paragraph;
      currentChunkIndex++;
    } else {
      // Add to current chunk
      currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
    }
  }
  
  // Add the last chunk if it has content
  if (currentChunk.length > 0) {
    chunks.push({
      content: currentChunk,
      metadata: { 
        type: 'text_chunk',
        index: currentChunkIndex
      }
    });
  }
  
  return chunks;
}

/**
 * Extract content from a document based on its type
 * @param {Buffer} fileBuffer - The file buffer
 * @param {string} fileType - The file type (pdf, docx, pptx, xlsx)
 * @returns {Promise<{text: string, metadata: Object, chunks: Array}>} Extracted text, metadata, and content chunks
 */
export async function extractContent(fileBuffer, fileType) {
  // Normalize file type
  const normalizedType = fileType.toLowerCase();
  
  switch (normalizedType) {
    case 'pdf':
      return extractPdfContent(fileBuffer);
    case 'doc':
    case 'docx':
      return extractDocxContent(fileBuffer);
    case 'ppt':
    case 'pptx':
      return extractPptContent(fileBuffer);
    case 'xls':
    case 'xlsx':
      return extractXlsxContent(fileBuffer);
    default:
      throw new Error(`Unsupported file type: ${fileType}`);
  }
}

/**
 * Generate embeddings for document chunks
 * @param {Array} chunks - Array of content chunks
 * @param {Object} options - Processing options
 * @param {boolean} options.useOpenAI - Whether to use enhanced OpenAI processing
 * @returns {Promise<Array>} Chunks with embeddings
 */
export async function generateEmbeddings(chunks, options = {}) {
  // Import the embeddings module
  const { generateChunkEmbeddings } = await import('../embeddings');
  
  // Use the embeddings module to generate embeddings
  // This will use OpenAI by default, but can be configured to use SBERT
  return generateChunkEmbeddings(chunks, options);
}
