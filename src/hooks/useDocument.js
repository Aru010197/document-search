import { useState, useCallback } from 'react';
import { useRouter } from 'next/router';

export default function useDocument() {
  const router = useRouter();
  
  // Document state
  const [document, setDocument] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Fetch document by ID
  const fetchDocument = useCallback(async (id) => {
    if (!id) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/documents/${id}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch document: ${response.statusText}`);
      }
      
      const data = await response.json();
      setDocument(data);
    } catch (err) {
      console.error('Error fetching document:', err);
      setError(err.message || 'Failed to fetch document');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Upload document
  const uploadDocument = useCallback(async (file, options = {}) => {
    if (!file) {
      setError('No file selected');
      return null;
    }
    
    // Check file type
    const fileType = file.name.split('.').pop().toLowerCase();
    const supportedTypes = ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx'];
    
    if (!supportedTypes.includes(fileType)) {
      setError(`Unsupported file type: ${fileType}. Supported types: PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX`);
      return null;
    }
    
    // Check file size (max 20MB)
    if (file.size > 20 * 1024 * 1024) {
      setError('File size exceeds 20MB limit');
      return null;
    }
    
    setIsUploading(true);
    setUploadProgress(0);
    setError(null);
    
    try {
      // Create form data
      const formData = new FormData();
      formData.append('file', file);
      
      // Always use OpenAI enhancement (mandatory)
      formData.append('useOpenAI', 'true');
      
      // Upload file
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Upload failed: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data;
    } catch (err) {
      console.error('Upload error:', err);
      setError(err.message || 'Failed to upload document');
      return null;
    } finally {
      setIsUploading(false);
      setUploadProgress(100);
    }
  }, []);

  // Delete document
  const deleteDocument = useCallback(async (id) => {
    if (!id) {
      setError('Document ID is required');
      return false;
    }
    
    try {
      const response = await fetch(`/api/documents/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to delete document: ${response.statusText}`);
      }
      
      return true;
    } catch (err) {
      console.error('Delete error:', err);
      setError(err.message || 'Failed to delete document');
      return false;
    }
  }, []);

  // Get document download URL
  const getDownloadUrl = useCallback(async (id) => {
    if (!id) {
      setError('Document ID is required');
      return null;
    }
    
    try {
      const response = await fetch(`/api/documents/${id}/download`);
      
      if (!response.ok) {
        throw new Error(`Failed to get download URL: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.url;
    } catch (err) {
      console.error('Download error:', err);
      setError(err.message || 'Failed to get download URL');
      return null;
    }
  }, []);

  // Navigate to document details page
  const viewDocument = useCallback((id) => {
    if (!id) return;
    router.push(`/documents/${id}`);
  }, [router]);

  return {
    document,
    isLoading,
    isUploading,
    error,
    uploadProgress,
    fetchDocument,
    uploadDocument,
    deleteDocument,
    getDownloadUrl,
    viewDocument
  };
}
