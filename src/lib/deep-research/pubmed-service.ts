/**
 * PubMed Service - Real PMID Collection and Validation
 */

export interface PMIDData {
  pmid: string;
  title: string;
  authors: string;
  journal: string;
  year: string;
  url: string;
  abstract?: string;
  keywords?: string[];
}

export class PubMedService {
  private baseUrl = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';
  private email: string;

  constructor(email: string = 'research@biodocsai.com') {
    this.email = email;
  }

  /**
   * Extract keywords from query (medical terms, procedures, diseases)
   */
  private extractKeywords(query: string): string[] {
    const keywords: string[] = [];
    const lower = query.toLowerCase();
    
    // Remove common stop words
    const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been', 'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should', 'could', 'may', 'might', 'must', 'can', 'about', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between', 'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'research', 'study', 'paper', 'article', 'write', 'generate', 'create'];
    
    // Split into words and filter
    const words = lower
      .replace(/[^\w\s-]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3 && !stopWords.includes(w));
    
    // Extract medical concepts using patterns
    const medicalConcepts = this.extractMedicalConcepts(query);
    keywords.push(...medicalConcepts);
    
    // Add remaining significant words
    keywords.push(...words.filter(w => !keywords.includes(w)));
    
    return [...new Set(keywords)]; // Remove duplicates
  }

  /**
   * Build advanced PubMed query with Boolean operators
   */
  private buildAdvancedQuery(keywords: string[]): string {
    if (keywords.length === 0) return '';
    if (keywords.length === 1) return keywords[0] || '';
    
    // Strategy: Use AND for first 2-3 most important terms, OR for the rest
    const primaryTerms = keywords.slice(0, Math.min(3, keywords.length));
    const secondaryTerms = keywords.slice(3);
    
    let query = primaryTerms.join(' AND ');
    
    if (secondaryTerms.length > 0) {
      query = `(${query}) AND (${secondaryTerms.join(' OR ')})`;
    }
    
    return query;
  }

  /**
   * Search PubMed and collect real PMIDs with improved keyword-based search
   */
  async searchPubMed(topic: string, maxResults: number = 30): Promise<string[]> {
    try {
      // CRITICAL: Clean and disambiguate the query first
      const cleanedQuery = this.cleanQuery(topic);
      console.log(`🔍 Original query: "${topic}"`);
      console.log(`🔍 Cleaned query: "${cleanedQuery}"`);
      
      const searchUrl = `${this.baseUrl}/esearch.fcgi`;
      const params = new URLSearchParams({
        db: 'pubmed',
        term: cleanedQuery,  // Use cleaned query instead of raw topic
        retmax: maxResults.toString(),
        retmode: 'json',
        sort: 'relevance',
        email: this.email,
      });

      const response = await fetch(`${searchUrl}?${params}`);
      const data = await response.json();
      
      const pmids = data.esearchresult?.idlist || [];
      console.log(`✅ Found ${pmids.length} PMIDs for: ${cleanedQuery}`);
      
      return pmids;
    } catch (error) {
      console.error('PubMed search error:', error);
      return [];
    }
  }

  /**
   * Fetch metadata for PMIDs
   */
  async fetchPMIDMetadata(pmids: string[]): Promise<Record<string, PMIDData>> {
    const metadata: Record<string, PMIDData> = {};

    // Process in batches of 10
    for (let i = 0; i < pmids.length; i += 10) {
      const batch = pmids.slice(i, i + 10);
      
      try {
        const fetchUrl = `${this.baseUrl}/esummary.fcgi`;
        const params = new URLSearchParams({
          db: 'pubmed',
          id: batch.join(','),
          retmode: 'json',
          email: this.email,
        });

        const response = await fetch(`${fetchUrl}?${params}`);
        const data = await response.json();

        for (const pmid of batch) {
          const result = data.result?.[pmid];
          if (result) {
            metadata[pmid] = {
              pmid,
              title: result.title || 'Research Article',
              authors: result.sortfirstauthor ? `${result.sortfirstauthor} et al.` : 'Various Authors',
              journal: result.source || 'Medical Journal',
              year: result.pubdate?.substring(0, 4) || '2024',
              url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
              abstract: '',
            };
          }
        }
      } catch (error) {
        console.error(`Error fetching batch ${i}-${i + 10}:`, error);
      }
    }

    console.log(`✅ Fetched metadata for ${Object.keys(metadata).length} PMIDs`);
    return metadata;
  }

  /**
   * Validate PMID exists
   */
  async validatePMID(pmid: string): Promise<boolean> {
    try {
      const url = `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`;
      const response = await fetch(url, { method: 'HEAD' });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Extract medical concepts from complex questions
   */
  private extractMedicalConcepts(topic: string): string[] {
    const concepts: string[] = [];
    const lower = topic.toLowerCase();
    
    // Common medical terms patterns
    const medicalPatterns = [
      // Diseases
      /\b(diabetes|hypertension|cancer|cirrhosis|ascites|hepatitis|pneumonia|asthma|copd|tuberculosis|malaria|covid|influenza|sepsis|stroke|myocardial infarction|heart failure|renal failure|kidney disease|liver disease|alzheimer|parkinson|epilepsy|schizophrenia|depression|anxiety)\b/gi,
      // Treatments
      /\b(treatment|therapy|medication|drug|surgery|chemotherapy|radiotherapy|immunotherapy|antibiotics|antivirals|antifungals|insulin|metformin|aspirin|statin|beta blocker|ace inhibitor|diuretic|corticosteroid|nsaid)\b/gi,
      // Procedures
      /\b(transplant|dialysis|catheterization|angioplasty|bypass|biopsy|endoscopy|colonoscopy|bronchoscopy|paracentesis|thoracentesis|lumbar puncture|intubation|ventilation)\b/gi,
      // Symptoms
      /\b(pain|fever|cough|dyspnea|edema|ascites|jaundice|bleeding|hemorrhage|infection|inflammation|nausea|vomiting|diarrhea|constipation|fatigue|weakness)\b/gi,
      // Body systems
      /\b(cardiac|cardiovascular|pulmonary|respiratory|hepatic|renal|neurological|gastrointestinal|endocrine|hematologic|immunologic|dermatologic)\b/gi,
      // Diagnostic terms
      /\b(diagnosis|screening|biomarker|imaging|ct scan|mri|ultrasound|x-ray|echocardiogram|ekg|ecg|blood test|biopsy)\b/gi,
    ];
    
    for (const pattern of medicalPatterns) {
      const matches = lower.match(pattern);
      if (matches) {
        concepts.push(...matches);
      }
    }
    
    return [...new Set(concepts)]; // Remove duplicates
  }

  /**
   * Clean and optimize search query with comprehensive disambiguation
   */
  private cleanQuery(query: string): string {
    const queryLower = query.toLowerCase();
    let cleaned = query.replace(/\b(research|study|paper|article|on|about|the|a|an|write|generate|create)\b/gi, ' ').trim();
    
    // ============================================================================
    // TYPO CORRECTION - Common medical term misspellings
    // ============================================================================
    const typoFixes: Record<string, string> = {
      'cirroshihs': 'cirrhosis',
      'cirrhisis': 'cirrhosis',
      'ascitis': 'ascites',
      'diabetis': 'diabetes',
      'hypertention': 'hypertension',
      'pnuemonia': 'pneumonia',
      'asthama': 'asthma',
      'tubercolosis': 'tuberculosis',
      'septicemia': 'sepsis',
      'alzhiemers': 'alzheimers',
      'parkinsons': 'parkinson',
      'leukimia': 'leukemia',
      'leukaemia': 'leukemia',
      'cancor': 'cancer',
      'tumour': 'tumor',
      'haemorrhage': 'hemorrhage',
      'oedema': 'edema',
    };
    
    for (const [typo, correct] of Object.entries(typoFixes)) {
      const regex = new RegExp(`\\b${typo}\\b`, 'gi');
      cleaned = cleaned.replace(regex, correct);
    }
    
    console.log(`🔧 Typo correction: "${query}" → "${cleaned}"`);
    
    // ============================================================================
    // DIABETES DISAMBIGUATION
    // ============================================================================
    if (queryLower.includes('diabetes')) {
      // Type 2 diabetes mellitus
      if (queryLower.match(/type\s*2|t2d|type\s*ii|mellitus|management|glycemic|glucose|metformin|insulin resistance|hba1c/i)) {
        cleaned = `${cleaned} diabetes mellitus type 2`;
        cleaned = `(${cleaned}) NOT (diabetes insipidus OR insipidus OR vasopressin OR ADH OR desmopressin)`;
        return cleaned;
      }
      // Type 1 diabetes
      else if (queryLower.match(/type\s*1|t1d|type\s*i|insulin.dependent/i)) {
        cleaned = `${cleaned} diabetes mellitus type 1`;
        cleaned = `(${cleaned}) NOT (diabetes insipidus)`;
        return cleaned;
      }
      // Diabetes insipidus - be specific
      else if (queryLower.includes('insipidus')) {
        return cleaned; // Keep as is
      }
      // Gestational diabetes
      else if (queryLower.match(/gestational|pregnancy/i)) {
        cleaned = `${cleaned} gestational diabetes`;
        return cleaned;
      }
      // Default "diabetes" - assume Type 2 mellitus
      else {
        cleaned = `${cleaned} diabetes mellitus type 2`;
        cleaned = `(${cleaned}) NOT (diabetes insipidus)`;
        return cleaned;
      }
    }
    
    // ============================================================================
    // CANCER DISAMBIGUATION
    // ============================================================================
    if (queryLower.includes('cancer')) {
      // Keep specific cancer type
      const cancerTypes = ['lung', 'breast', 'colon', 'colorectal', 'prostate', 'pancreatic', 'liver', 'stomach', 'brain', 'skin', 'melanoma', 'leukemia', 'lymphoma'];
      const hasSpecificType = cancerTypes.some(type => queryLower.includes(type));
      
      if (hasSpecificType) {
        // Keep as is - specific type mentioned
        return cleaned;
      } else {
        // Generic "cancer" - add "neoplasm" for better results
        cleaned = `${cleaned} neoplasm`;
        return cleaned;
      }
    }
    
    // ============================================================================
    // HEART DISEASE DISAMBIGUATION
    // ============================================================================
    if (queryLower.match(/heart|cardiac|cardiovascular/i)) {
      // Heart failure
      if (queryLower.match(/failure|chf/i)) {
        cleaned = `${cleaned} heart failure`;
        cleaned = `(${cleaned}) NOT (renal failure OR kidney failure)`;
        return cleaned;
      }
      // Heart attack / MI
      else if (queryLower.match(/attack|myocardial infarction|mi\b/i)) {
        cleaned = `${cleaned} myocardial infarction`;
        return cleaned;
      }
      // Coronary artery disease
      else if (queryLower.match(/coronary|cad/i)) {
        cleaned = `${cleaned} coronary artery disease`;
        return cleaned;
      }
    }
    
    // ============================================================================
    // KIDNEY DISEASE DISAMBIGUATION
    // ============================================================================
    if (queryLower.match(/kidney|renal/i)) {
      // Chronic kidney disease
      if (queryLower.match(/chronic|ckd/i)) {
        cleaned = `${cleaned} chronic kidney disease`;
        return cleaned;
      }
      // Acute kidney injury
      else if (queryLower.match(/acute|aki/i)) {
        cleaned = `${cleaned} acute kidney injury`;
        return cleaned;
      }
    }
    
    // ============================================================================
    // CRISPR/GENE EDITING DISAMBIGUATION
    // ============================================================================
    if (queryLower.match(/crispr|cas9|gene editing/i)) {
      // Keep specific disease context if mentioned
      // Add required terms
      if (!queryLower.includes('cas9')) {
        cleaned = `${cleaned} CRISPR Cas9`;
      }
      return cleaned;
    }
    
    // ============================================================================
    // HYPERTENSION DISAMBIGUATION
    // ============================================================================
    if (queryLower.match(/hypertension|high blood pressure/i)) {
      cleaned = `${cleaned} hypertension`;
      // Exclude pulmonary hypertension unless specifically mentioned
      if (!queryLower.includes('pulmonary')) {
        cleaned = `(${cleaned}) NOT (pulmonary hypertension)`;
      }
      return cleaned;
    }
    
    // ============================================================================
    // STANDARD CLEANING FOR OTHER TOPICS
    // ============================================================================
    // Remove special characters that might break PubMed search
    cleaned = cleaned.replace(/[^\w\s-()]/g, ' ');
    
    // Remove extra spaces
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    
    return cleaned;
  }

  /**
   * Clean and optimize search query for PubMed
   */
  private cleanSearchQuery(topic: string): string {
    return this.cleanQuery(topic);
  }

  /**
   * Get full research data for topic with improved fuzzy/keyword search
   */
  async getResearchData(topic: string, minPMIDs: number = 20): Promise<{
    pmids: string[];
    metadata: Record<string, PMIDData>;
    cleanedTopic: string;
  }> {
    // Clean the search query
    const cleanedTopic = this.cleanSearchQuery(topic);
    console.log(`🔍 Searching PubMed for: ${cleanedTopic}`);
    
    // Extract keywords for fallback strategies
    const keywords = this.extractKeywords(cleanedTopic);
    console.log(`📝 Extracted keywords: ${keywords.join(', ')}`);
    
    // Try multiple search strategies
    let pmids: string[] = [];
    
    // Strategy 1: Cleaned query (exact phrase)
    console.log(`🔍 Strategy 1: Exact cleaned query`);
    pmids = await this.searchPubMed(cleanedTopic, 30);
    
    // Strategy 2: Keyword-based AND search (most restrictive)
    if (pmids.length < minPMIDs && keywords.length >= 2) {
      console.log(`⚠️ Only ${pmids.length} results, trying keyword AND search...`);
      const andQuery = keywords.slice(0, 3).join(' AND ');
      pmids = await this.searchPubMed(andQuery, 30);
    }
    
    // Strategy 3: Advanced Boolean query (balanced)
    if (pmids.length < minPMIDs && keywords.length >= 2) {
      console.log(`⚠️ Only ${pmids.length} results, trying advanced Boolean query...`);
      const advancedQuery = this.buildAdvancedQuery(keywords);
      pmids = await this.searchPubMed(advancedQuery, 30);
    }
    
    // Strategy 4: Keyword-based OR search (more permissive)
    if (pmids.length < minPMIDs && keywords.length > 0) {
      console.log(`⚠️ Only ${pmids.length} results, trying keyword OR search...`);
      const orQuery = keywords.join(' OR ');
      pmids = await this.searchPubMed(orQuery, 30);
    }
    
    // Strategy 5: Individual top keywords (fuzzy)
    if (pmids.length < minPMIDs && keywords.length > 0) {
      console.log(`⚠️ Only ${pmids.length} results, trying top keywords individually...`);
      for (const keyword of keywords.slice(0, 3)) {
        const keywordPmids = await this.searchPubMed(keyword, 30);
        pmids = [...new Set([...pmids, ...keywordPmids])];
        if (pmids.length >= minPMIDs) break;
      }
    }
    
    // Strategy 6: Try with quotes (exact phrase match)
    if (pmids.length < minPMIDs) {
      console.log(`⚠️ Only ${pmids.length} results, trying quoted search...`);
      pmids = await this.searchPubMed(`"${cleanedTopic}"`, 30);
    }
    
    // Strategy 7: Try just the first major word
    if (pmids.length < minPMIDs) {
      console.log(`⚠️ Only ${pmids.length} results, trying primary term...`);
      const words = cleanedTopic.split(' ').filter(w => w.length > 4);
      if (words.length > 0 && words[0]) {
        pmids = await this.searchPubMed(words[0], 30);
      }
    }
    
    // Strategy 8: Try original topic as last resort
    if (pmids.length < minPMIDs && cleanedTopic !== topic) {
      console.log(`⚠️ Only ${pmids.length} results, trying original query...`);
      pmids = await this.searchPubMed(topic, 30);
    }
    
    if (pmids.length < minPMIDs) {
      throw new Error(`Only found ${pmids.length} PMIDs for "${cleanedTopic}". Try using more specific medical terms like disease names, treatments, or procedures.`);
    }

    const metadata = await this.fetchPMIDMetadata(pmids.slice(0, minPMIDs));
    
    return { 
      pmids: pmids.slice(0, minPMIDs), 
      metadata,
      cleanedTopic 
    };
  }
}
