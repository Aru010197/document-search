import { useState, useRef } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Layout from '../components/layout/Layout';
import DocumentIcon from '../components/documents/DocumentIcon';
import useDocument from '../hooks/useDocument';
import { FaCloudUploadAlt, FaSpinner, FaCheckCircle, FaExclamationCircle, FaFile } from 'react-icons/fa';

export default function UploadPage() {
  const router = useRouter();
  const fileInputRef = useRef(null);
  
  const { uploadDocument, isUploading, error } = useDocument();
  
  const [selectedFile, setSelectedFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadedDocument, setUploadedDocument] = useState(null);
  
  // Handle file selection
  const handleFileSelect = (files) => {
    if (files && files.length > 0) {
      setSelectedFile(files[0]);
      setUploadSuccess(false);
      setUploadedDocument(null);
    }
  };
  
  // Handle file input change
  const handleFileInputChange = (e) => {
    handleFileSelect(e.target.files);
  };
  
  // Handle drag events
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };
  
  // Handle drop event
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files);
    }
  };
  
  // Handle upload button click
  const handleUploadClick = () => {
    fileInputRef.current.click();
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedFile) return;
    
    try {
      const result = await uploadDocument(selectedFile);
      
      if (result) {
        setUploadSuccess(true);
        setUploadedDocument(result.document);
        setSelectedFile(null);
      }
    } catch (err) {
      console.error('Upload error:', err);
    }
  };
  
  // Handle view document click
  const handleViewDocument = () => {
    if (uploadedDocument) {
      router.push(`/documents/${uploadedDocument.id}`);
    }
  };
  
  // Get file type from file
  const getFileType = (file) => {
    if (!file) return '';
    return file.name.split('.').pop().toLowerCase();
  };
  
  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB';
    else return (bytes / 1073741824).toFixed(1) + ' GB';
  };
  
  return (
    <Layout>
      <Head>
        <title>Upload Document | Document Search App</title>
        <meta name="description" content="Upload documents to search and analyze" />
      </Head>
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-800 mb-6">Upload Document</h1>
          
          <div className="bg-white rounded-lg shadow p-6">
            {/* Success message */}
            {uploadSuccess && (
              <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <FaCheckCircle className="text-green-500 mr-2" />
                  <h3 className="text-lg font-medium text-green-800">Upload Successful</h3>
                </div>
                <p className="text-green-700 mb-4">
                  Your document has been uploaded and processed successfully.
                </p>
                <div className="flex justify-end">
                  <button
                    onClick={handleViewDocument}
                    className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                  >
                    View Document
                  </button>
                </div>
              </div>
            )}
            
            {/* Error message */}
            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <FaExclamationCircle className="text-red-500 mr-2" />
                  <h3 className="text-lg font-medium text-red-800">Upload Failed</h3>
                </div>
                <p className="text-red-700">{error}</p>
              </div>
            )}
            
            {/* Upload form */}
            <form onSubmit={handleSubmit}>
              {/* Drag and drop area */}
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center ${
                  dragActive ? 'border-primary-500 bg-primary-50' : 'border-gray-300'
                } ${selectedFile ? 'bg-gray-50' : ''}`}
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx"
                  onChange={handleFileInputChange}
                />
                
                {!selectedFile ? (
                  <div className="space-y-4">
                    <FaCloudUploadAlt className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="text-lg text-gray-700">
                      Drag and drop your document here, or{' '}
                      <button
                        type="button"
                        onClick={handleUploadClick}
                        className="text-primary-600 hover:text-primary-800 font-medium focus:outline-none"
                      >
                        browse
                      </button>
                    </div>
                    <p className="text-sm text-gray-500">
                      Supported formats: PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX
                    </p>
                    <p className="text-sm text-gray-500">
                      Maximum file size: 20MB
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-center">
                      <div className="mr-4">
                        <DocumentIcon type={getFileType(selectedFile)} size="lg" />
                      </div>
                      <div className="text-left">
                        <h3 className="text-lg font-medium text-gray-800">
                          {selectedFile.name}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {formatFileSize(selectedFile.size)} • {getFileType(selectedFile).toUpperCase()}
                        </p>
                      </div>
                    </div>
                    
                    <div>
                      <button
                        type="button"
                        onClick={() => setSelectedFile(null)}
                        className="text-sm text-gray-500 hover:text-gray-700 mr-4"
                      >
                        Change file
                      </button>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Upload button */}
              <div className="mt-6 flex justify-end">
                <button
                  type="submit"
                  disabled={!selectedFile || isUploading}
                  className={`px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${
                    !selectedFile || isUploading
                      ? 'bg-gray-300 cursor-not-allowed'
                      : 'bg-primary-600 text-white hover:bg-primary-700'
                  }`}
                >
                  {isUploading ? (
                    <>
                      <FaSpinner className="inline animate-spin mr-2" />
                      Uploading...
                    </>
                  ) : (
                    'Upload Document'
                  )}
                </button>
              </div>
            </form>
          </div>
          
          {/* Supported formats info */}
          <div className="mt-8 bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Supported Document Formats</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start">
                <DocumentIcon type="pdf" className="mr-3 flex-shrink-0" />
                <div>
                  <h3 className="font-medium text-gray-800">PDF Documents</h3>
                  <p className="text-sm text-gray-600">
                    Portable Document Format files (.pdf)
                  </p>
                </div>
              </div>
              
              <div className="flex items-start">
                <DocumentIcon type="doc" className="mr-3 flex-shrink-0" />
                <div>
                  <h3 className="font-medium text-gray-800">Word Documents</h3>
                  <p className="text-sm text-gray-600">
                    Microsoft Word files (.doc, .docx)
                  </p>
                </div>
              </div>
              
              <div className="flex items-start">
                <DocumentIcon type="ppt" className="mr-3 flex-shrink-0" />
                <div>
                  <h3 className="font-medium text-gray-800">Presentations</h3>
                  <p className="text-sm text-gray-600">
                    PowerPoint files (.ppt, .pptx)
                  </p>
                </div>
              </div>
              
              <div className="flex items-start">
                <DocumentIcon type="xls" className="mr-3 flex-shrink-0" />
                <div>
                  <h3 className="font-medium text-gray-800">Spreadsheets</h3>
                  <p className="text-sm text-gray-600">
                    Excel files (.xls, .xlsx)
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
