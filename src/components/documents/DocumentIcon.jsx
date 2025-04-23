import React from 'react';
import { 
  FaFilePdf, 
  FaFileWord, 
  FaFilePowerpoint, 
  FaFileExcel, 
  FaFile 
} from 'react-icons/fa';

/**
 * Component to display an icon for a document based on its type
 * 
 * @param {Object} props
 * @param {string} props.type - The document type (pdf, doc, docx, ppt, pptx, xls, xlsx)
 * @param {string} props.size - The icon size (sm, md, lg)
 * @param {string} props.className - Additional CSS classes
 * @returns {JSX.Element}
 */
export default function DocumentIcon({ type, size = 'md', className = '' }) {
  // Normalize the type
  const normalizedType = type ? type.toLowerCase() : '';
  
  // Determine the icon based on the document type
  let Icon;
  let iconColor;
  
  switch (normalizedType) {
    case 'pdf':
      Icon = FaFilePdf;
      iconColor = 'text-red-500';
      break;
    case 'doc':
    case 'docx':
      Icon = FaFileWord;
      iconColor = 'text-blue-500';
      break;
    case 'ppt':
    case 'pptx':
      Icon = FaFilePowerpoint;
      iconColor = 'text-orange-500';
      break;
    case 'xls':
    case 'xlsx':
      Icon = FaFileExcel;
      iconColor = 'text-green-500';
      break;
    default:
      Icon = FaFile;
      iconColor = 'text-gray-500';
  }
  
  // Determine the icon size
  let iconSize;
  switch (size) {
    case 'sm':
      iconSize = 'w-6 h-6';
      break;
    case 'lg':
      iconSize = 'w-12 h-12';
      break;
    case 'md':
    default:
      iconSize = 'w-8 h-8';
  }
  
  return (
    <div className={`${iconSize} ${iconColor} ${className}`}>
      <Icon className="w-full h-full" />
    </div>
  );
}
