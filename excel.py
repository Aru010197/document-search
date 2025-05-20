#!/usr/bin/env python3
"""
Document Uploader Script

This script reads an Excel file containing document links, downloads the documents,
and uploads them to Supabase storage. It also processes the documents and adds
their metadata to the database.

Usage:
    python excel.py --excel-file <path_to_excel_file> --column <link_column_name>

Requirements:
    - Python 3.7+
    - pip install pandas openpyxl requests supabase python-dotenv tqdm
"""

import os
import sys
import argparse
import uuid
import tempfile
from pathlib import Path
import mimetypes
import json
from datetime import datetime

# Try to import required packages, install if missing
required_packages = {
    'pandas': 'pandas',
    'requests': 'requests',
    'tqdm': 'tqdm',
    'python-dotenv': 'dotenv',
    'supabase': 'supabase'
}

missing_packages = []

for package, module in required_packages.items():
    try:
        __import__(module)
    except ImportError:
        missing_packages.append(package)

if missing_packages:
    print(f"Installing missing packages: {' '.join(missing_packages)}")
    try:
        import subprocess
        subprocess.check_call([sys.executable, "-m", "pip", "install"] + missing_packages)
        print("Successfully installed missing packages")
        
        # Try importing again
        for package, module in required_packages.items():
            if package in missing_packages:
                try:
                    __import__(module)
                except ImportError as e:
                    print(f"Error: Failed to import {module} after installation: {e}")
                    sys.exit(1)
    except Exception as e:
        print(f"Error installing packages: {e}")
        print("Please install them manually using pip:")
        print(f"pip install {' '.join(missing_packages)}")
        sys.exit(1)

import pandas as pd
import requests
from tqdm import tqdm
from dotenv import load_dotenv
# Load environment variables from .env.local
load_dotenv('.env.local')

# Supabase configuration
SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: Supabase credentials not found in .env.local file.")
    print("Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.")
    sys.exit(1)

print(f"Using Supabase URL: {SUPABASE_URL}")
print(f"Supabase key exists: {bool(SUPABASE_KEY)}")

# Supabase API helper functions
def supabase_upload_file(bucket, path, file_content, content_type=None):
    """Upload a file to Supabase Storage using direct API calls."""
    headers = {
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'apikey': SUPABASE_KEY
    }
    
    if content_type:
        headers['Content-Type'] = content_type
    
    url = f"{SUPABASE_URL}/storage/v1/object/{bucket}/{path}"
    
    response = requests.post(url, headers=headers, data=file_content)
    
    if response.status_code != 200:
        print(f"Error uploading file: {response.status_code} - {response.text}")
        return None
    
    return response.json()

def supabase_insert_record(table, record):
    """Insert a record into a Supabase table using direct API calls."""
    headers = {
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'apikey': SUPABASE_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
    }
    
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    
    response = requests.post(url, headers=headers, json=record)
    
    if response.status_code != 201:
        print(f"Error inserting record: {response.status_code} - {response.text}")
        return None
    
    return response.json()

def parse_arguments():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(description='Upload documents from Excel file to Supabase')
    parser.add_argument('--excel-file', required=True, help='Path to Excel file containing document links')
    parser.add_argument('--column', required=True, help='Column name containing document links')
    parser.add_argument('--sheet', default=0, help='Sheet name or index (default: first sheet)')
    parser.add_argument('--name-column', help='Column name containing document names (optional)')
    parser.add_argument('--type-column', help='Column name containing document types (optional)')
    parser.add_argument('--author-column', help='Column name containing document authors (optional)')
    parser.add_argument('--date-column', help='Column name containing document dates (optional)')
    return parser.parse_args()

def download_file(url, temp_dir):
    """Download a file from a URL to a temporary directory."""
    try:
        # Convert Google Drive sharing links to direct download links
        if 'drive.google.com/file/d/' in url:
            file_id = url.split('/file/d/')[1].split('/')[0].split('?')[0]
            url = f"https://drive.google.com/uc?export=download&id={file_id}"
        elif 'drive.google.com/open?id=' in url:
            file_id = url.split('open?id=')[1].split('&')[0]
            url = f"https://drive.google.com/uc?export=download&id={file_id}"
        
        print(f"Downloading from URL: {url}")
        response = requests.get(url, stream=True)
        response.raise_for_status()
        
        # Try to get filename from Content-Disposition header
        content_disposition = response.headers.get('Content-Disposition')
        if content_disposition and 'filename=' in content_disposition:
            filename = content_disposition.split('filename=')[1].strip('"\'')
        else:
            # Use the last part of the URL as filename
            filename = url.split('/')[-1].split('?')[0]
            
            # If no extension, try to determine from content-type
            if '.' not in filename:
                content_type = response.headers.get('Content-Type', '')
                ext = mimetypes.guess_extension(content_type)
                if ext:
                    filename += ext
        
        # Create a temporary file
        temp_file_path = os.path.join(temp_dir, filename)
        
        # Download the file with progress bar
        total_size = int(response.headers.get('content-length', 0))
        with open(temp_file_path, 'wb') as f, tqdm(
            desc=filename,
            total=total_size,
            unit='B',
            unit_scale=True,
            unit_divisor=1024,
        ) as bar:
            for chunk in response.iter_content(chunk_size=8192):
                size = f.write(chunk)
                bar.update(size)
        
        return temp_file_path, filename
    except Exception as e:
        print(f"Error downloading {url}: {str(e)}")
        return None, None

def get_file_type(filename):
    """Get the file type from the filename extension."""
    ext = Path(filename).suffix.lower().lstrip('.')
    
    # Map extensions to standardized types
    if ext in ['pdf']:
        return 'pdf'
    elif ext in ['doc', 'docx']:
        return 'docx'
    elif ext in ['ppt', 'pptx']:
        return 'pptx'
    elif ext in ['xls', 'xlsx']:
        return 'xlsx'
    else:
        return ext

def upload_to_supabase(file_path, filename, metadata=None):
    """Upload a file to Supabase storage and add metadata to the database."""
    try:
        # Generate a unique ID for the document
        document_id = str(uuid.uuid4())
        
        # Get file type from extension
        file_type = get_file_type(filename)
        
        # Get file size
        file_size = os.path.getsize(file_path)
        
        # Get mimetype
        mimetype, _ = mimetypes.guess_type(filename)
        
        # Read file content
        with open(file_path, 'rb') as f:
            file_content = f.read()
        
        # Upload file to Supabase storage
        storage_path = f"{document_id}/{filename}"
        result = supabase_upload_file(
            'documents',
            storage_path,
            file_content,
            mimetype or "application/octet-stream"
        )
        
        if not result or not result.get('Key'):
            print(f"Error uploading {filename} to storage")
            return None
        
        # Prepare metadata for database
        now = datetime.now().isoformat()
        
        # Use provided metadata or defaults
        doc_metadata = {
            "title": metadata.get('name', filename) if metadata else filename,
            "author": metadata.get('author') if metadata else None,
            "upload_date": now,
            "last_modified": metadata.get('date') if metadata else now,
            "file_type": file_type,
            "source_url": metadata.get('url') if metadata else None,
        }
        
        # Insert document metadata into database
        db_result = supabase_insert_record('documents', {
            "id": document_id,
            "filename": filename,
            "filetype": file_type,
            "filesize": file_size,
            "storage_path": storage_path,
            "title": doc_metadata['title'],
            "author": doc_metadata['author'],
            "upload_date": doc_metadata['upload_date'],
            "last_modified": doc_metadata['last_modified'],
            "metadata": doc_metadata,
        })
        
        if not db_result:
            print(f"Error adding {filename} metadata to database")
            return None
        
        print(f"Successfully uploaded {filename} (ID: {document_id})")
        return document_id
    
    except Exception as e:
        print(f"Error processing {filename}: {str(e)}")
        return None

def main():
    """Main function to process Excel file and upload documents."""
    args = parse_arguments()
    
    # Check if Excel file exists
    if not os.path.exists(args.excel_file):
        print(f"Error: Excel file '{args.excel_file}' not found.")
        sys.exit(1)
    
    try:
        # Read Excel file
        print(f"Reading Excel file: {args.excel_file}")
        df = pd.read_excel(args.excel_file, sheet_name=args.sheet)
        
        # Check if link column exists
        if args.column not in df.columns:
            print(f"Error: Column '{args.column}' not found in Excel file.")
            print(f"Available columns: {', '.join(df.columns)}")
            sys.exit(1)
        
        # Create temporary directory for downloads
        with tempfile.TemporaryDirectory() as temp_dir:
            print(f"Created temporary directory: {temp_dir}")
            
            # Process each row in the Excel file
            successful_uploads = 0
            failed_uploads = 0
            
            for index, row in df.iterrows():
                url = row[args.column]
                
                # Skip empty URLs
                if pd.isna(url) or not url.strip():
                    continue
                
                print(f"\nProcessing document {index+1}/{len(df)}: {url}")
                
                # Gather metadata from other columns if provided
                metadata = {
                    'url': url
                }
                
                if args.name_column and args.name_column in df.columns:
                    metadata['name'] = row[args.name_column]
                
                if args.author_column and args.author_column in df.columns:
                    metadata['author'] = row[args.author_column]
                
                if args.date_column and args.date_column in df.columns:
                    date_value = row[args.date_column]
                    if isinstance(date_value, (datetime, pd.Timestamp)):
                        metadata['date'] = date_value.isoformat()
                    elif isinstance(date_value, str):
                        try:
                            # Try to parse date string
                            parsed_date = pd.to_datetime(date_value)
                            metadata['date'] = parsed_date.isoformat()
                        except:
                            metadata['date'] = date_value
                
                if args.type_column and args.type_column in df.columns:
                    metadata['type'] = row[args.type_column]
                
                # Download the file
                temp_file_path, filename = download_file(url, temp_dir)
                
                if not temp_file_path:
                    print(f"Skipping {url} due to download error")
                    failed_uploads += 1
                    continue
                
                # Upload to Supabase
                document_id = upload_to_supabase(temp_file_path, filename, metadata)
                
                if document_id:
                    successful_uploads += 1
                else:
                    failed_uploads += 1
            
            # Print summary
            print("\n" + "="*50)
            print(f"Upload Summary:")
            print(f"  Total documents processed: {successful_uploads + failed_uploads}")
            print(f"  Successfully uploaded: {successful_uploads}")
            print(f"  Failed uploads: {failed_uploads}")
            print("="*50)
            
    except Exception as e:
        print(f"Error processing Excel file: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()
