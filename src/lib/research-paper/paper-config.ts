/**
 * Research Paper Configuration Types
 */

import { CitationStyle } from './citation-formatter';

export type EssayType = 
  | 'Literature Review (Summary of Existing Research)'
  | 'Systematic Review (Comprehensive Literature Analysis)'
  | 'Narrative Review (Topic Overview)'
  | 'Critical Analysis (Evaluation of Research)'
  | 'Research Summary (Synthesis of Studies)'
  | 'case-study'
  | 'lab-report';

export type AcademicLevel = 
  | 'high-school'
  | 'college'
  | 'graduate'
  | 'doctoral';

export interface ResearchPaperConfig {
  // Basic Info
  topic: string;
  essayType: EssayType;
  academicLevel: AcademicLevel;
  citationStyle: CitationStyle;
  
  // Content Settings
  targetWordCount: number;
  minReferences: number;
  
  // Source Selection
  sources: {
    pubmed: boolean;
    arxiv: boolean;
    web: boolean;
  };
  
  // Optional
  language?: string;
  customInstructions?: string;
}

export const ESSAY_TYPE_INFO: Record<EssayType, {
  name: string;
  description: string;
  sections: string[];
  minWords: number;
  maxWords: number;
}> = {
  'Literature Review (Summary of Existing Research)': {
    name: 'Literature Review',
    description: 'Analysis and summary of existing research',
    sections: ['Abstract', 'Introduction', 'Literature Review', 'Synthesis', 'Discussion', 'Conclusion', 'References'],
    minWords: 3000,
    maxWords: 10000
  },
  'Systematic Review (Comprehensive Literature Analysis)': {
    name: 'Systematic Review',
    description: 'Comprehensive synthesis of existing studies (NOT original data collection)',
    sections: ['Introduction', 'Thematic Analysis', 'Critical Evaluation', 'Research Gaps', 'Conclusion', 'References'],
    minWords: 2500,
    maxWords: 8000
  },
  'Narrative Review (Topic Overview)': {
    name: 'Narrative Review',
    description: 'Broad overview of research on a topic (NOT original study)',
    sections: ['Introduction', 'Background', 'Key Findings', 'Synthesis', 'Future Directions', 'Conclusion', 'References'],
    minWords: 1500,
    maxWords: 5000
  },
  'Critical Analysis (Evaluation of Research)': {
    name: 'Critical Analysis',
    description: 'Evaluation and critique of existing research (NOT new data)',
    sections: ['Introduction', 'Analysis', 'Evidence', 'Interpretation', 'Conclusion', 'References'],
    minWords: 1500,
    maxWords: 5000
  },
  'Research Summary (Synthesis of Studies)': {
    name: 'Research Summary',
    description: 'Synthesis of multiple studies on a topic (NOT original research)',
    sections: ['Introduction', 'Study Summaries', 'Comparative Analysis', 'Conclusions', 'References'],
    minWords: 2000,
    maxWords: 6000
  },
  'case-study': {
    name: 'Case Study',
    description: 'Detailed examination of a specific case or situation',
    sections: ['Introduction', 'Background', 'Case Description', 'Analysis', 'Findings', 'Recommendations', 'Conclusion', 'References'],
    minWords: 2000,
    maxWords: 6000
  },
  'lab-report': {
    name: 'Lab Report',
    description: 'Scientific report of experimental procedures and results',
    sections: ['Abstract', 'Introduction', 'Materials & Methods', 'Results', 'Discussion', 'Conclusion', 'References'],
    minWords: 1500,
    maxWords: 4000
  }
};

export const ACADEMIC_LEVEL_INFO: Record<AcademicLevel, {
  name: string;
  description: string;
  vocabularyLevel: string;
  analysisDepth: string;
  citationDensity: string;
  recommendedWordCount: { min: number; max: number };
}> = {
  'high-school': {
    name: 'High School',
    description: 'Clear, accessible writing with fundamental analysis',
    vocabularyLevel: 'Standard academic vocabulary',
    analysisDepth: 'Basic analysis with clear explanations',
    citationDensity: '1-2 citations per paragraph',
    recommendedWordCount: { min: 1500, max: 3000 }
  },
  'college': {
    name: 'College/Undergraduate',
    description: 'Sophisticated analysis with academic rigor',
    vocabularyLevel: 'Advanced academic vocabulary',
    analysisDepth: 'Critical analysis with multiple perspectives',
    citationDensity: '2-3 citations per paragraph',
    recommendedWordCount: { min: 3000, max: 6000 }
  },
  'graduate': {
    name: 'Graduate/Masters',
    description: 'Advanced theoretical frameworks and comprehensive analysis',
    vocabularyLevel: 'Specialized disciplinary terminology',
    analysisDepth: 'Sophisticated theoretical analysis',
    citationDensity: '3-4 citations per paragraph',
    recommendedWordCount: { min: 5000, max: 8000 }
  },
  'doctoral': {
    name: 'Doctoral/PhD',
    description: 'Original contributions with extensive literature integration',
    vocabularyLevel: 'Expert-level disciplinary language',
    analysisDepth: 'Original insights and comprehensive synthesis',
    citationDensity: '4-5 citations per paragraph',
    recommendedWordCount: { min: 7000, max: 12000 }
  }
};

export const DEFAULT_CONFIG: ResearchPaperConfig = {
  topic: '',
  essayType: 'Literature Review (Summary of Existing Research)',
  academicLevel: 'college',
  citationStyle: 'APA',
  targetWordCount: 5000,
  minReferences: 20,
  sources: {
    pubmed: true,
    arxiv: false,
    web: false
  },
  language: 'English'
};
