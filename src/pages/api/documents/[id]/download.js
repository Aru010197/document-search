import { getServerSupabase } from '../../../../lib/supabase';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Document ID is required' });
  }

  try {
    // Get server-side Supabase client
    const supabase = getServerSupabase();
    
    // Fetch document details to get the filename
    const { data: document, error: documentError } = await supabase
      .from('documents')
      .select('filename')
      .eq('id', id)
      .single();
    
    if (documentError) {
      console.error('Error fetching document:', documentError);
      return res.status(500).json({ error: 'Failed to fetch document' });
    }
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    // Use the filename as the storage path
    const storagePath = document.filename;
    
    try {
      console.log('Attempting to create signed URL for document:', {
        documentId: id,
        filename: document.filename,
        storagePath: storagePath,
        bucketName: 'document'
      });
      
      // Try to get the file from storage
      const { data: urlData, error: urlError } = await supabase
        .storage
        .from('document')
        .createSignedUrl(storagePath, 60 * 60); // 1 hour expiry
      
      if (urlError) {
        console.error('Error generating download URL:', urlError);
        console.error('Error details:', JSON.stringify(urlError, null, 2));
        
        // Return a more detailed error message
        return res.status(500).json({
          error: 'Failed to generate download URL',
          details: urlError.message,
          code: urlError.code,
          storagePath: storagePath,
          bucketName: 'document'
        });
      }
      
      if (!urlData?.signedUrl) {
        // Instead of returning an error, provide a fallback message
        return res.status(200).json({
          url: null,
          filename: document.filename,
          message: 'Document preview not available. The file may not be accessible in storage.',
          status: 'unavailable'
        });
      }
      
      // Return the signed URL for download
      return res.status(200).json({
        url: urlData.signedUrl,
        filename: document.filename,
        status: 'available'
      });
    } catch (storageError) {
      console.error('Error accessing storage:', storageError);
      // Instead of returning an error, provide a fallback message
      return res.status(200).json({
        url: null,
        filename: document.filename,
        message: 'Document preview not available. The file may not be accessible in storage.',
        status: 'unavailable'
      });
    }
  } catch (error) {
    console.error('Error handling download request:', error);
    return res.status(500).json({ error: 'Failed to process download request' });
  }
}
