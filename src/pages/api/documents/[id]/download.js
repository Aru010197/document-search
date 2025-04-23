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
      .select('filename, storage_path')
      .eq('id', id)
      .single();
    
    if (documentError) {
      console.error('Error fetching document:', documentError);
      return res.status(500).json({ error: 'Failed to fetch document' });
    }
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    // Generate download URL
    const { data: urlData, error: urlError } = await supabase
      .storage
      .from('documents')
      .createSignedUrl(`${id}/${document.filename}`, 60 * 60); // 1 hour expiry
    
    if (urlError) {
      console.error('Error generating download URL:', urlError);
      return res.status(500).json({ error: 'Failed to generate download URL' });
    }
    
    if (!urlData?.signedUrl) {
      return res.status(404).json({ error: 'Document file not found' });
    }
    
    // Return the signed URL for download
    return res.status(200).json({
      url: urlData.signedUrl,
      filename: document.filename
    });
  } catch (error) {
    console.error('Error handling download request:', error);
    return res.status(500).json({ error: 'Failed to process download request' });
  }
}
