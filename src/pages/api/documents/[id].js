import { getServerSupabase } from '../../../lib/supabase';

export default async function handler(req, res) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Document ID is required' });
  }

  if (req.method === 'GET') {
    try {
      // Get server-side Supabase client
      const supabase = getServerSupabase();
      
      // Fetch document details
      const { data: document, error: documentError } = await supabase
        .from('documents')
        .select('*')
        .eq('id', id)
        .single();
      
      if (documentError) {
        console.error('Error fetching document:', documentError);
        return res.status(500).json({ error: 'Failed to fetch document' });
      }
      
      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }
      
      // Fetch document chunks
      const { data: chunks, error: chunksError } = await supabase
        .from('document_chunks')
        .select('id, content, chunk_index, metadata')
        .eq('document_id', id)
        .order('chunk_index', { ascending: true });
      
      if (chunksError) {
        console.error('Error fetching document chunks:', chunksError);
        return res.status(500).json({ error: 'Failed to fetch document chunks' });
      }
      
      // Generate download URL
      const { data: urlData, error: urlError } = await supabase
        .storage
        .from('documents')
        .createSignedUrl(`${id}/${document.filename}`, 60 * 60); // 1 hour expiry
      
      const downloadUrl = urlError ? null : urlData?.signedUrl;
      
      // Return document with chunks
      return res.status(200).json({
        ...document,
        chunks: chunks || [],
        downloadUrl
      });
    } catch (error) {
      console.error('Error handling document request:', error);
      return res.status(500).json({ error: 'Failed to process request' });
    }
  } else if (req.method === 'DELETE') {
    try {
      // Get server-side Supabase client
      const supabase = getServerSupabase();
      
      // Delete document (cascade will handle chunks)
      const { error: deleteError } = await supabase
        .from('documents')
        .delete()
        .eq('id', id);
      
      if (deleteError) {
        console.error('Error deleting document:', deleteError);
        return res.status(500).json({ error: 'Failed to delete document' });
      }
      
      // Delete from storage
      const { error: storageError } = await supabase
        .storage
        .from('documents')
        .remove([`${id}`]);
      
      if (storageError) {
        console.error('Error deleting document from storage:', storageError);
        // Continue anyway as the database record is deleted
      }
      
      return res.status(200).json({ success: true, message: 'Document deleted successfully' });
    } catch (error) {
      console.error('Error handling document deletion:', error);
      return res.status(500).json({ error: 'Failed to process deletion request' });
    }
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}
