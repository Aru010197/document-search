// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');

// Initialize Supabase client with environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Using Supabase URL:', supabaseUrl);
console.log('Supabase Service Key exists:', !!supabaseServiceKey);

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
  },
});

// Sample document content for each document
const sampleContent = {
  'Beauty & Personal Care.pptx': [
    "Beauty and Personal Care industry overview. This presentation covers market trends, consumer behavior, and growth opportunities in the beauty and personal care sector.",
    "Key segments in the beauty industry include skincare, haircare, makeup, fragrances, perfumes, and personal hygiene products.",
    "The global beauty and personal care market is expected to reach $716.6 billion by 2025, growing at a CAGR of 5.9% from 2020 to 2025.",
    "The perfume and fragrance segment is projected to grow at 6.2% annually, driven by premium brands and personalized scent offerings.",
    "Major trends in beauty and personal care include clean beauty, sustainable packaging, personalization, and digital transformation.",
    "Leading companies in the beauty industry include L'Oréal, Unilever, Procter & Gamble, Estée Lauder, and Shiseido."
  ],
  'Automobile Industry.pptx': [
    "Automobile Industry analysis and market overview. This presentation examines the current state and future trends of the global automotive sector.",
    "The automotive industry is undergoing significant transformation with the rise of electric vehicles, autonomous driving technology, and mobility services.",
    "Major players in the automobile industry include Toyota, Volkswagen, General Motors, Ford, and Tesla.",
    "Electric vehicle adoption is accelerating globally, with government incentives, improving battery technology, and expanding charging infrastructure.",
    "Connected cars and IoT integration are creating new revenue streams and business models for automotive manufacturers."
  ],
  'Data Center _ EMB.pptx': [
    "Data Center industry overview and EMB (Emerging Markets Business) strategy. This presentation covers data center infrastructure, operations, and growth opportunities.",
    "The global data center market is projected to grow at a CAGR of 13.8% from 2021 to 2026, driven by cloud computing, big data, and AI applications.",
    "Key components of modern data centers include servers, storage systems, networking equipment, and cooling infrastructure.",
    "Emerging markets present significant growth opportunities for data center providers due to increasing digital transformation and internet penetration.",
    "Sustainability and energy efficiency are becoming critical considerations in data center design and operations."
  ],
  'EMB __ CTO Deck.pptx': [
    "EMB (Emerging Markets Business) strategy presentation for the CTO office. This deck outlines technology initiatives and digital transformation in emerging markets.",
    "Key technology focus areas include cloud computing, artificial intelligence, blockchain, and IoT applications tailored for emerging market needs.",
    "The CTO office is responsible for technology strategy, innovation management, and digital transformation initiatives across the organization.",
    "Emerging markets present unique challenges and opportunities for technology deployment, including infrastructure limitations and leapfrog innovation potential.",
    "Strategic technology partnerships and ecosystem development are essential for successful market entry and expansion in emerging economies."
  ],
  'HealthTech x EMB.pptx': [
    "HealthTech and EMB (Emerging Markets Business) collaboration strategy. This presentation explores digital health solutions for emerging markets.",
    "Digital health technologies include telemedicine, remote patient monitoring, electronic health records, and AI-powered diagnostic tools.",
    "Emerging markets face unique healthcare challenges, including limited infrastructure, workforce shortages, and accessibility issues that can be addressed through technology.",
    "Mobile health applications are particularly promising in emerging markets due to high smartphone penetration and limited traditional healthcare access.",
    "Successful healthtech deployment in emerging markets requires localization, affordability, and integration with existing healthcare systems.",
    "Healthcare education and training programs are essential components of successful healthtech implementations in emerging markets.",
    "Building sustainable healthcare systems requires both technological innovation and education of healthcare professionals.",
    "Web-based platforms for healthcare delivery are becoming increasingly important in remote and underserved areas."
  ],
  'LMS.pptx': [
    "Learning Management System (LMS) implementation strategy. This presentation covers the selection, deployment, and optimization of enterprise learning platforms.",
    "Key features of modern LMS platforms include course creation tools, content management, assessment capabilities, and analytics dashboards.",
    "Benefits of LMS implementation include standardized training delivery, reduced training costs, improved compliance tracking, and personalized learning experiences.",
    "Integration considerations include HRIS systems, content libraries, video conferencing tools, and single sign-on authentication.",
    "Success metrics for LMS implementation include user adoption rates, course completion rates, knowledge retention, and return on investment.",
    "Education and training programs are essential components of successful LMS implementations in organizations.",
    "Building sustainable learning ecosystems requires both technological innovation and education of employees.",
    "Web-based platforms for education delivery are becoming increasingly important in remote and hybrid work environments.",
    "The LMS should support various learning modalities including self-paced courses, instructor-led training, and blended learning approaches.",
    "Content creation tools should enable instructional designers to develop engaging and interactive educational materials.",
    "Assessment capabilities should include quizzes, assignments, and practical evaluations to measure learning outcomes.",
    "Analytics dashboards provide insights into learner progress, content effectiveness, and overall program success.",
    "Mobile learning capabilities allow employees to access educational content on smartphones and tablets.",
    "Social learning features facilitate knowledge sharing and collaboration among learners.",
    "Gamification elements can increase engagement and motivation in educational programs."
  ],
  'Multi-vendor e-comm DECK.pptx': [
    "Multi-vendor e-commerce platform strategy. This presentation outlines the business model, technology requirements, and operational considerations for marketplace platforms.",
    "Multi-vendor e-commerce platforms enable multiple sellers to list products on a single website, with the platform owner managing the marketplace infrastructure.",
    "Key components include vendor management systems, product catalog management, order processing, payment distribution, and customer service tools.",
    "Revenue models typically include commission on sales, subscription fees for sellers, featured listing fees, and advertising opportunities.",
    "Successful multi-vendor platforms require critical mass of both sellers and buyers, quality control mechanisms, and efficient dispute resolution processes."
  ],
  'Real Estate, Engineering & Construction x EMB.pptx': [
    "Real Estate, Engineering & Construction industry overview and EMB (Emerging Markets Business) strategy. This presentation examines market trends and growth opportunities.",
    "The construction industry in emerging markets is expected to grow at 5.2% annually through 2025, driven by urbanization, infrastructure development, and foreign investment.",
    "Key segments include residential construction, commercial real estate, infrastructure projects, and industrial facilities.",
    "Digital transformation in construction includes Building Information Modeling (BIM), construction management software, drone surveying, and prefabrication technologies.",
    "Sustainability trends include green building certification, energy-efficient design, and circular economy principles in construction waste management."
  ],
  'Textile Industry.pptx': [
    "Textile Industry analysis and market overview. This presentation covers the global textile and apparel value chain, from fiber production to retail distribution.",
    "The global textile market is projected to reach $1.23 trillion by 2025, with Asia-Pacific remaining the dominant manufacturing hub.",
    "Major segments include apparel, home textiles, technical textiles, and luxury fabrics.",
    "Industry challenges include sustainability concerns, labor practices, supply chain transparency, and increasing competition.",
    "Innovation areas include smart textiles, sustainable materials, digital printing technologies, and automation in manufacturing processes."
  ]
};

/**
 * Add sample document chunks to the database
 */
async function addSampleChunks() {
  try {
    console.log('Checking if documents exist in the database...');
    
    // Get existing documents
    const { data: documents, error: documentsError } = await supabase
      .from('documents')
      .select('id, filename');
    
    if (documentsError) {
      console.error('Error fetching documents:', documentsError);
      return;
    }
    
    if (!documents || documents.length === 0) {
      console.log('No documents found in the database. Please run create_document_entries.js first.');
      return;
    }
    
    console.log(`Found ${documents.length} documents in the database.`);
    
    // Check if document_chunks table exists
    console.log('Checking if document_chunks table exists...');
    const { error: tableCheckError } = await supabase
      .from('document_chunks')
      .select('id')
      .limit(1);
    
    if (tableCheckError) {
      console.error('Error: The document_chunks table does not exist or is not accessible.');
      console.error('Please run the schema.sql script to create the necessary tables.');
      console.error('Error details:', tableCheckError);
      return;
    }
    
    console.log('The document_chunks table exists. Checking for existing chunks...');
    
    // Get existing chunks
    const { data: existingChunks, error: chunksError } = await supabase
      .from('document_chunks')
      .select('document_id');
    
    if (chunksError) {
      console.error('Error checking existing chunks:', chunksError);
      return;
    }
    
    const processedDocIds = new Set(existingChunks?.map(chunk => chunk.document_id) || []);
    console.log(`Found ${processedDocIds.size} documents with existing chunks.`);
    
    // Process each document
    let addedCount = 0;
    let skippedCount = 0;
    
    for (const doc of documents) {
      // Skip if already has chunks
      if (processedDocIds.has(doc.id)) {
        console.log(`Skipping ${doc.filename} - already has chunks`);
        skippedCount++;
        continue;
      }
      
      // Get sample content for this document
      const content = sampleContent[doc.filename];
      
      if (!content) {
        console.log(`No sample content available for ${doc.filename}. Skipping.`);
        continue;
      }
      
      console.log(`Adding ${content.length} chunks for ${doc.filename}...`);
      
      // Add chunks for this document
      for (let i = 0; i < content.length; i++) {
        const chunkText = content[i];
        
        const { error: insertError } = await supabase
          .from('document_chunks')
          .insert({
            id: uuidv4(),
            document_id: doc.id,
            chunk_index: i,
            content: chunkText,
            embedding: Array(1536).fill(0.1), // Dummy embedding vector with 1536 dimensions
            metadata: {
              document_id: doc.id,
              chunk_index: i,
              char_start: 0,
              char_end: chunkText.length
            }
          });
        
        if (insertError) {
          console.error(`Error adding chunk ${i} for ${doc.filename}:`, insertError);
        } else {
          console.log(`Added chunk ${i} for ${doc.filename}`);
          addedCount++;
        }
      }
    }
    
    console.log('\nSummary:');
    console.log(`Documents processed: ${documents.length}`);
    console.log(`Documents skipped (already had chunks): ${skippedCount}`);
    console.log(`Chunks added: ${addedCount}`);
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Run the script
console.log('Starting add-sample-chunks.js script...');
addSampleChunks()
  .then(() => {
    console.log('Script completed successfully.');
  })
  .catch(error => {
    console.error('Script failed with error:', error);
  });
