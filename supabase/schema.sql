--- Create tables for document search application

-- Documents table to store document metadata
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  filename TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  drive_file_id TEXT,
  status TEXT NOT NULL DEFAULT 'uploading',
  processing_progress INTEGER DEFAULT 0,
  error_message TEXT,
  metadata JSONB,
  text_content TEXT,
  entities JSONB,
  topics JSONB,
  summary TEXT,
  keywords JSONB,
  sentiment TEXT,
  relationships JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create index on document text content for full-text search
CREATE INDEX documents_text_content_idx ON documents USING GIN (to_tsvector('english', text_content));

-- Added FTS index for documents.filename
CREATE INDEX IF NOT EXISTS idx_fts_documents_filename ON documents USING gin(to_tsvector('english', filename));

-- Added FTS index for documents.metadata as text
CREATE INDEX IF NOT EXISTS idx_fts_documents_metadata_text ON documents USING gin(to_tsvector('english', metadata::text));

-- Create GIN index for FTS on documents.filename
CREATE INDEX IF NOT EXISTS documents_filename_fts_idx ON documents USING gin (to_tsvector('english', filename));

-- Create GIN index for FTS on documents.metadata (cast to text)
CREATE INDEX IF NOT EXISTS documents_metadata_fts_idx ON documents USING gin (to_tsvector('english', metadata::text));

-- Create index on document metadata for JSON search
CREATE INDEX documents_metadata_idx ON documents USING GIN (metadata);

-- Create index on document entities for JSON search
CREATE INDEX documents_entities_idx ON documents USING GIN (entities);

-- Create index on document topics for JSON search
CREATE INDEX documents_topics_idx ON documents USING GIN (topics);

-- Create index on document keywords for JSON search
CREATE INDEX documents_keywords_idx ON documents USING GIN (keywords);

-- Processing queue table to store document processing queue
CREATE TABLE processing_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  drive_file_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  filetype TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  priority INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'queued',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Search history table to store user search history
CREATE TABLE search_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  enhanced_query JSONB,
  filters JSONB,
  result_count INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Search results table to store search results
CREATE TABLE search_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  search_id UUID REFERENCES search_history(id) ON DELETE CASCADE,
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  relevance_score FLOAT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE processing_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_results ENABLE ROW LEVEL SECURITY;

-- Create policies for documents table
CREATE POLICY "Users can view their own documents" 
  ON documents FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own documents" 
  ON documents FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own documents" 
  ON documents FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own documents" 
  ON documents FOR DELETE 
  USING (auth.uid() = user_id);

-- Create policies for processing_queue table
CREATE POLICY "Users can view their own processing queue" 
  ON processing_queue FOR SELECT 
  USING (auth.uid() = (SELECT user_id FROM documents WHERE id = document_id));

-- Create policies for search_history table
CREATE POLICY "Users can view their own search history" 
  ON search_history FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own search history" 
  ON search_history FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Create policies for search_results table
CREATE POLICY "Users can view their own search results" 
  ON search_results FOR SELECT 
  USING (auth.uid() = (SELECT user_id FROM search_history WHERE id = search_id));

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to update updated_at timestamp
CREATE TRIGGER update_documents_updated_at
BEFORE UPDATE ON documents
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_processing_queue_updated_at
BEFORE UPDATE ON processing_queue
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Install the vector extension for semantic search
CREATE EXTENSION IF NOT EXISTS vector;

-- Create a table for document embeddings
CREATE TABLE document_embeddings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  embedding vector(1536),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create an index for vector similarity search
CREATE INDEX document_embeddings_embedding_idx ON document_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Enable Row Level Security (RLS) for document_embeddings
ALTER TABLE document_embeddings ENABLE ROW LEVEL SECURITY;

-- Create policies for document_embeddings table
CREATE POLICY "Users can view their own document embeddings" 
  ON document_embeddings FOR SELECT 
  USING (auth.uid() = (SELECT user_id FROM documents WHERE id = document_id));

-- Create a table for document chunk embeddings
CREATE TABLE document_chunk_embeddings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  chunk_text TEXT NOT NULL,
  embedding vector(1536),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create an index for vector similarity search on chunks
CREATE INDEX document_chunk_embeddings_embedding_idx ON document_chunk_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Add a full-text search index to the chunk_text column in the document_chunk_embeddings table
CREATE INDEX document_chunk_embeddings_chunk_text_idx ON document_chunk_embeddings USING gin (to_tsvector('english', chunk_text));

-- Enable Row Level Security (RLS) for document_chunk_embeddings
ALTER TABLE document_chunk_embeddings ENABLE ROW LEVEL SECURITY;

-- Create policies for document_chunk_embeddings table
CREATE POLICY "Users can view their own document chunk embeddings" 
  ON document_chunk_embeddings FOR SELECT 
  USING (auth.uid() = (SELECT user_id FROM documents WHERE id = document_id));

-- Create a function for vector similarity search
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector(1536),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id UUID,
  document_id UUID,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    document_embeddings.id,
    document_embeddings.document_id,
    1 - (document_embeddings.embedding <=> query_embedding) AS similarity
  FROM document_embeddings
  WHERE 1 - (document_embeddings.embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;

-- Create a function for vector similarity search on document chunks
CREATE OR REPLACE FUNCTION match_document_chunks(
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  p_file_type_filter TEXT DEFAULT NULL -- New parameter for file type filtering
)
RETURNS TABLE (
  id UUID,
  document_id UUID,
  chunk_index INTEGER,
  chunk_text TEXT,
  similarity float,
  doc_filename TEXT,        -- New field from documents table
  doc_file_type TEXT,       -- New field from documents table
  doc_file_size BIGINT,     -- New field from documents table
  doc_metadata JSONB        -- New field from documents table
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  EXECUTE
    'SELECT ' ||
    '  dce.id, ' ||
    '  dce.document_id, ' ||
    '  dce.chunk_index, ' ||
    '  dce.chunk_text, ' ||
    '  (1 - (dce.embedding <=> $1)) AS similarity, ' || -- $1 for query_embedding
    '  d.filename as doc_filename, ' ||
    '  d.file_type as doc_file_type, ' ||
    '  d.file_size as doc_file_size, ' ||
    '  d.metadata as doc_metadata ' ||
    'FROM document_chunk_embeddings dce ' ||
    'JOIN documents d ON dce.document_id = d.id ' ||
    'WHERE (1 - (dce.embedding <=> $1)) > $2' || -- $1 for query_embedding, $2 for match_threshold
    (CASE
        WHEN p_file_type_filter IS NOT NULL AND p_file_type_filter <> '' THEN
            format(' AND d.file_type = %L', p_file_type_filter) -- Safely literalized
        ELSE
            ''
    END) ||
    ' ORDER BY similarity DESC ' ||
    'LIMIT $3' -- $3 for match_count
  USING query_embedding, match_threshold, match_count;
END;
$$;

-- Create a function to find contextual relationships between documents
CREATE OR REPLACE FUNCTION find_document_relationships(
  document_id UUID,
  relationship_threshold float DEFAULT 0.7,
  max_relationships int DEFAULT 10
)
RETURNS TABLE (
  related_document_id UUID,
  relationship_strength float,
  relationship_type TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH document_embedding AS (
    SELECT embedding
    FROM document_embeddings
    WHERE document_id = find_document_relationships.document_id
  )
  SELECT
    de.document_id AS related_document_id,
    1 - (de.embedding <=> (SELECT embedding FROM document_embedding)) AS relationship_strength,
    'semantic_similarity' AS relationship_type
  FROM document_embeddings de
  WHERE de.document_id != find_document_relationships.document_id
  AND 1 - (de.embedding <=> (SELECT embedding FROM document_embedding)) > relationship_threshold
  ORDER BY relationship_strength DESC
  LIMIT max_relationships;
END;
$$;

-- Create search analytics table to track search behavior
CREATE TABLE search_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  query TEXT,
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  result_position INTEGER,
  filters JSONB,
  sort_by TEXT,
  page INTEGER,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB
);

-- Create index on search analytics timestamp for faster queries
CREATE INDEX search_analytics_timestamp_idx ON search_analytics (timestamp);

-- Create index on search analytics event type for faster filtering
CREATE INDEX search_analytics_event_type_idx ON search_analytics (event_type);

-- Create index on search analytics query for faster text search
CREATE INDEX search_analytics_query_idx ON search_analytics (query);

-- Create index on search analytics user_id for faster user filtering
CREATE INDEX search_analytics_user_id_idx ON search_analytics (user_id);

-- Create index on search analytics session_id for faster session filtering
CREATE INDEX search_analytics_session_id_idx ON search_analytics (session_id);

-- Enable Row Level Security (RLS) for search_analytics
ALTER TABLE search_analytics ENABLE ROW LEVEL SECURITY;

-- Create policies for search_analytics table
CREATE POLICY "Users can view their own search analytics" 
  ON search_analytics FOR SELECT 
  USING (auth.uid() = user_id OR auth.uid() IN (
    SELECT id FROM auth.users WHERE auth.users.role = 'admin'
  ));

CREATE POLICY "Users can insert their own search analytics" 
  ON search_analytics FOR INSERT 
  WITH CHECK (auth.uid() = user_id OR auth.uid() IS NULL);

-- Create document clusters table
CREATE TABLE document_clusters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  topics JSONB,
  centroid vector(1536),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create document cluster memberships table
CREATE TABLE document_cluster_memberships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cluster_id UUID REFERENCES document_clusters(id) ON DELETE CASCADE,
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  similarity_score FLOAT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(cluster_id, document_id)
);

-- Create index on document cluster memberships
CREATE INDEX document_cluster_memberships_cluster_id_idx ON document_cluster_memberships (cluster_id);
CREATE INDEX document_cluster_memberships_document_id_idx ON document_cluster_memberships (document_id);

-- Enable Row Level Security (RLS) for document_clusters
ALTER TABLE document_clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_cluster_memberships ENABLE ROW LEVEL SECURITY;

-- Create policies for document_clusters table
CREATE POLICY "Users can view document clusters" 
  ON document_clusters FOR SELECT 
  USING (true);

-- Create policies for document_cluster_memberships table
CREATE POLICY "Users can view document cluster memberships" 
  ON document_cluster_memberships FOR SELECT 
  USING (true);


-- Add policy to allow inserting document embeddings
-- For testing purposes, we'll allow any insertion
CREATE POLICY "Allow all document embedding insertions" 
  ON document_embeddings FOR INSERT 
  WITH CHECK (true);

-- Add policy to allow inserting document chunk embeddings
-- For testing purposes, we'll allow any insertion
CREATE POLICY "Allow all document chunk embedding insertions" 
  ON document_chunk_embeddings FOR INSERT 
  WITH CHECK (true);

create policy "Public read access" on storage.objects
for select using (bucket_id = 'document');

  -- Disable RLS for document_embeddings table
ALTER TABLE document_embeddings DISABLE ROW LEVEL SECURITY;

-- Disable RLS for document_chunk_embeddings table
ALTER TABLE document_chunk_embeddings DISABLE ROW LEVEL SECURITY;


  -- Modify the documents table to make user_id optional
ALTER TABLE documents ALTER COLUMN user_id DROP NOT NULL;

-- Remove the storage_path column from the documents table
ALTER TABLE documents DROP COLUMN storage_path;

- Add a full-text search index to the chunk_text column in the document_chunk_embeddings table
CREATE INDEX document_chunk_embeddings_chunk_text_idx ON document_chunk_embeddings USING gin (to_tsvector('english', chunk_text));




DROP FUNCTION IF EXISTS public.keyword_search_documents(
    p_key_terms TEXT[],
    p_exact_phrases TEXT[],
    p_file_type_filter TEXT,
    p_limit INT,
    p_offset INT,
    p_query_text TEXT
);




DROP FUNCTION IF EXISTS public.keyword_search_documents(
    p_query_text TEXT,
    p_key_terms TEXT[],
    p_exact_phrases TEXT[],
    p_file_type_filter TEXT,
    p_limit INT,
    p_offset INT
);




CREATE OR REPLACE FUNCTION keyword_search_documents(
    p_key_terms TEXT[],          -- Array of key terms to search for
    p_exact_phrases TEXT[],      -- Array of exact phrases to search for
    p_file_type_filter TEXT,     -- Optional: filter by document file type
    p_limit INT,                 -- For pagination: number of results per page
    p_offset INT,                -- For pagination: number of results to skip
    p_query_text TEXT DEFAULT NULL -- The original full query text, used as a fallback
)
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
    query_conditions TEXT := '';
    condition_parts TEXT[] := '{}'; -- Initialize as an empty array
    main_query TEXT;
    count_query TEXT;
    query_results RECORD;
    results_array JSON[] := '{}'; -- Initialize as an empty JSON array
    total_count INT;
    term TEXT;
    phrase TEXT;
    search_criteria_added BOOLEAN := FALSE;
BEGIN
    -- Build OR conditions from key terms using FTS
    IF p_key_terms IS NOT NULL AND array_length(p_key_terms, 1) > 0 THEN
        FOREACH term IN ARRAY p_key_terms LOOP
            condition_parts := array_append(condition_parts, format('to_tsvector(''english'', dce.chunk_text) @@ plainto_tsquery(''english'', %L)', term));
            condition_parts := array_append(condition_parts, format('to_tsvector(''english'', d.filename) @@ plainto_tsquery(''english'', %L)', term));
            condition_parts := array_append(condition_parts, format('to_tsvector(''english'', d.metadata::text) @@ plainto_tsquery(''english'', %L)', term));
        END LOOP;
        search_criteria_added := TRUE;
    END IF;

    -- Build OR conditions from exact phrases (remains ILIKE for exact phrase matching on chunk_text)
    IF p_exact_phrases IS NOT NULL AND array_length(p_exact_phrases, 1) > 0 THEN
        FOREACH phrase IN ARRAY p_exact_phrases LOOP
            condition_parts := array_append(condition_parts, format('dce.chunk_text ILIKE %L', '%' || phrase || '%'));
        END LOOP;
        search_criteria_added := TRUE;
    END IF;

    -- Fallback: If no specific key terms or exact phrases were processed,
    -- use p_query_text itself as a general search term using FTS.
    IF NOT search_criteria_added AND p_query_text IS NOT NULL AND p_query_text <> '' THEN
        condition_parts := array_append(condition_parts, format('to_tsvector(''english'', dce.chunk_text) @@ plainto_tsquery(''english'', %L)', p_query_text));
        condition_parts := array_append(condition_parts, format('to_tsvector(''english'', d.filename) @@ plainto_tsquery(''english'', %L)', p_query_text));
        condition_parts := array_append(condition_parts, format('to_tsvector(''english'', d.metadata::text) @@ plainto_tsquery(''english'', %L)', p_query_text));
        search_criteria_added := TRUE;
    END IF;

    -- Combine OR conditions
    IF array_length(condition_parts, 1) > 0 THEN
        query_conditions := '(' || array_to_string(condition_parts, ' OR ') || ')';
    END IF;

    -- Add file type filter (AND condition)
    IF p_file_type_filter IS NOT NULL AND p_file_type_filter <> '' THEN
        IF query_conditions <> '' THEN
            query_conditions := query_conditions || format(' AND d.file_type = %L', p_file_type_filter);
        ELSE
            query_conditions := format('d.file_type = %L', p_file_type_filter);
        END IF;
        search_criteria_added := TRUE;
    END IF;

    -- If no search criteria at all, default to a condition that returns no results.
    IF NOT search_criteria_added THEN
        query_conditions := 'FALSE';
    END IF;
    
    IF query_conditions = '' AND search_criteria_added THEN
        query_conditions := 'TRUE'; 
    ELSIF query_conditions = '' AND NOT search_criteria_added THEN
        query_conditions := 'FALSE';
    END IF;

    -- Construct Count Query
    count_query := 'SELECT COUNT(DISTINCT dce.id) FROM document_chunk_embeddings dce JOIN documents d ON dce.document_id = d.id WHERE ' || query_conditions;
    
    RAISE NOTICE 'Executing count_query: %', count_query; -- For debugging
    EXECUTE count_query INTO total_count;

    -- Construct Main Data Query
    main_query := 'SELECT dce.id as chunk_id, dce.document_id, dce.chunk_text, dce.chunk_index, ' ||
                  'd.filename as doc_filename, d.file_type as doc_file_type, d.file_size as doc_file_size, d.metadata as doc_metadata, ' ||
                  '0.0 as score ' || -- Placeholder for relevance score
                  'FROM document_chunk_embeddings dce JOIN documents d ON dce.document_id = d.id ' ||
                  'WHERE ' || query_conditions ||
                  ' ORDER BY d.id, dce.chunk_index ASC ' || 
                  'LIMIT ' || p_limit || ' OFFSET ' || p_offset;

    RAISE NOTICE 'Executing main_query: %', main_query; -- For debugging

    FOR query_results IN EXECUTE main_query LOOP
        results_array := array_append(results_array, row_to_json(query_results));
    END LOOP;
    
    IF array_length(results_array, 1) IS NULL THEN
        results_array := '{}'; 
    END IF;

    RETURN json_build_object('data', results_array, 'count', total_count);
END;
$$;


CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Index for document_chunk_embeddings.chunk_text
CREATE INDEX IF NOT EXISTS idx_gin_chunk_text_trgm ON document_chunk_embeddings USING gin (chunk_text gin_trgm_ops);

-- Index for documents.filename
CREATE INDEX IF NOT EXISTS idx_gin_documents_filename_trgm ON documents USING gin (filename gin_trgm_ops);

-- Index for documents.metadata (as text)
-- For JSONB metadata, you might need a more specific indexing strategy if you search specific keys.
-- If you are casting the whole JSONB to text for searching, an index on an immutable expression can be used.
-- However, searching within JSONB is often better done with JSONB-specific operators and indexes.
-- For now, let's assume you are broadly searching the text representation.
-- If `metadata` is JSONB and you frequently search its text representation:
CREATE INDEX IF NOT EXISTS idx_gin_documents_metadata_text_trgm ON documents USING gin ((metadata::text) gin_trgm_ops);
-- If `metadata` is already TEXT, then:
-- CREATE INDEX IF NOT EXISTS idx_gin_documents_metadata_trgm ON documents USING gin (metadata gin_trgm_ops);