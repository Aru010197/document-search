# Document Search Application

A powerful document search application that allows users to search through multiple document formats (PDF, DOCX, PPTX, XLSX) with contextual search capabilities.

## Features

- **Multi-format Support**: Search across PDF, Word, PowerPoint, and Excel documents
- **Contextual Search**: Find what you're looking for with context-aware results
- **Advanced Filtering**: Filter results by file type, date, author, and more
- **Vector Search**: Semantic search using vector embeddings for better results
- **Responsive Design**: Works on desktop, tablet, and mobile devices

## Tech Stack

- **Frontend**: Next.js, React, Tailwind CSS
- **Backend**: Next.js API Routes, Supabase
- **Database**: PostgreSQL with pgvector extension
- **Storage**: Supabase Storage
- **Deployment**: Vercel
- **Embeddings**: OpenAI API and TensorFlow.js Universal Sentence Encoder

## Getting Started

### Prerequisites

- Node.js 14.x or later
- npm or yarn
- Supabase account

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/document-search-app.git
   cd document-search-app
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Set up environment variables:
   - Copy `.env.local.example` to `.env.local`
   - Fill in your Supabase credentials and other environment variables

4. Set up Supabase:
   - Create a new Supabase project
   - Run the SQL script in `supabase/schema.sql` to set up the database schema
   - Create a storage bucket named `documents`

5. Run the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## Embedding Providers

The application supports two embedding providers for vector search:

1. **OpenAI API** (Default): Uses OpenAI's text-embedding-ada-002 model for high-quality embeddings
   - Requires an OpenAI API key
   - 1536-dimensional vectors
   - Better semantic understanding

2. **Universal Sentence Encoder**: Uses TensorFlow.js Universal Sentence Encoder
   - No API key required, runs locally in the browser or Node.js
   - 512-dimensional vectors
   - Faster processing, lower resource requirements

You can switch between providers by setting the `NEXT_PUBLIC_EMBEDDING_PROVIDER` environment variable to either `openai` or `sbert` (the name is kept as 'sbert' for backward compatibility).

## Project Structure

```
document-search-app/
├── public/                  # Static assets
├── src/
│   ├── components/          # React components
│   │   ├── documents/       # Document-related components
│   │   ├── layout/          # Layout components
│   │   ├── search/          # Search-related components
│   │   └── ui/              # UI components
│   ├── config/              # Configuration files
│   ├── hooks/               # Custom React hooks
│   ├── lib/                 # Utility functions and libraries
│   │   ├── content-extractors/  # Document content extraction
│   │   ├── embeddings/      # Vector embedding generation
│   │   └── metadata-extractors/ # Document metadata extraction
│   ├── pages/               # Next.js pages
│   │   ├── api/             # API routes
│   │   └── documents/       # Document-related pages
│   └── styles/              # Global styles
├── supabase/                # Supabase configuration
│   └── schema.sql           # Database schema
├── .env.local               # Environment variables
├── next.config.js           # Next.js configuration
├── postcss.config.js        # PostCSS configuration
└── tailwind.config.js       # Tailwind CSS configuration
```

## API Routes

- `GET /api/search`: Search for documents
- `POST /api/upload`: Upload a new document
- `GET /api/documents/[id]`: Get document details
- `GET /api/documents/[id]/download`: Download a document

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request


## Acknowledgements

- [Next.js](https://nextjs.org/)
- [Supabase](https://supabase.io/)
- [Tailwind CSS](https://tailwindcss.com/)
- [pgvector](https://github.com/pgvector/pgvector)
- [OpenAI](https://openai.com/)
- [TensorFlow.js](https://www.tensorflow.org/js)
- [Universal Sentence Encoder](https://tfhub.dev/google/universal-sentence-encoder/4)


