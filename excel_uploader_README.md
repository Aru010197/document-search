# Excel Document Importer

This tool allows you to import documents from an Excel file containing links to documents. It's particularly useful for importing documents from Google Drive links.

## Features

- Import documents from links stored in an Excel file
- Support for Google Drive links
- Automatic conversion of Google Drive sharing links to direct download links
- Metadata extraction from Excel columns (document name, author, date)
- Automatic processing of documents after import

## Usage

### Web Interface

1. Navigate to the "Import Excel" page in the application
2. Upload your Excel file
3. Select the column containing document links
4. Optionally, select columns for document name, author, and date
5. Click "Import Documents"
6. Wait for the import process to complete
7. Once complete, the documents will be searchable in the application

### Command Line

You can also use the command line tool directly:

```bash
python excel.py --excel-file "path/to/your/excel_file.xlsx" --column "LinkColumn" --name-column "NameColumn" --author-column "AuthorColumn" --date-column "DateColumn"
```

Parameters:
- `--excel-file`: Path to the Excel file containing document links (required)
- `--column`: Column name containing document links (required)
- `--sheet`: Sheet name or index (default: first sheet)
- `--name-column`: Column name containing document names (optional)
- `--author-column`: Column name containing document authors (optional)
- `--date-column`: Column name containing document dates (optional)

## Preparing Your Excel File

1. Create an Excel file with a column containing document links
2. For Google Drive links, make sure the documents are shared with "Anyone with the link"
3. Optionally, add columns for document names, authors, and dates

Example Excel format:
| DocumentLink | DocumentName | Author | Date |
|--------------|--------------|--------|------|
| https://drive.google.com/file/d/1a2b3c4d5e6f7g8h9i0j/view?usp=sharing | Annual Report | John Doe | 2025-01-15 |
| https://drive.google.com/open?id=0B1a2b3c4d5e6f7g8h9i0j | Meeting Minutes | Jane Smith | 2025-02-20 |

## Google Drive Links

The tool automatically converts Google Drive sharing links to direct download links. It supports the following formats:

- `https://drive.google.com/file/d/{file_id}/view?usp=sharing`
- `https://drive.google.com/open?id={file_id}`

These are converted to:
- `https://drive.google.com/uc?export=download&id={file_id}`

## Supported Document Types

- PDF Documents (.pdf)
- Word Documents (.doc, .docx)
- PowerPoint Presentations (.ppt, .pptx)
- Excel Spreadsheets (.xls, .xlsx)

## After Import

After importing, the documents will be processed to extract text and generate embeddings. This may take some time depending on the number and size of documents. Once processing is complete, the documents will be searchable in the application.

## Troubleshooting

### Google Drive Access Issues

If you encounter issues with Google Drive links:

1. **Check file permissions**: Ensure files are shared with "Anyone with the link"
2. **Handle Google Drive warning page**: For large files, Google Drive shows a warning page instead of directly downloading. Try downloading the file manually and then uploading it directly.
3. **Rate limiting**: Google Drive may rate-limit multiple downloads. If importing many files, try importing in smaller batches.

### Excel File Issues

1. **Column names not found**: Make sure the column names in your Excel file match exactly what you specify in the command line or web interface.
2. **Excel file format**: The tool supports .xlsx and .xls formats. Make sure your file is saved in one of these formats.

### Import Process Issues

1. **Python dependencies**: Make sure you have the required Python packages installed:
   ```bash
   pip install pandas openpyxl requests supabase python-dotenv tqdm
   ```
2. **Supabase configuration**: Make sure your .env.local file contains valid Supabase credentials:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
