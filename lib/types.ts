export enum ResearchSessionStatus {
  CREATED = 'CREATED',
  AWAITING_REFINEMENTS = 'AWAITING_REFINEMENTS',
  REFINEMENTS_IN_PROGRESS = 'REFINEMENTS_IN_PROGRESS',
  REFINEMENTS_COMPLETE = 'REFINEMENTS_COMPLETE',
  RUNNING_RESEARCH = 'RUNNING_RESEARCH',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export interface RefinementQuestion {
  question: string;
  index: number;
}

export interface ResearchResult {
  openaiResult?: string;
  geminiResult?: string;
}

export interface ResearchSessionData {
  id: string;
  userId: string;
  initialPrompt: string;
  refinedPrompt?: string;
  status: ResearchSessionStatus;
  openaiResult?: string;
  geminiResult?: string;
  pdfUrl?: string;
  pdfGeneratedAt?: Date;
  emailSentAt?: Date;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
  refinements: RefinementData[];
}

export interface RefinementData {
  id: string;
  question: string;
  answer?: string;
  questionIndex: number;
  answeredAt?: Date;
}

export interface DeepResearchResponse {
  refinementQuestions?: RefinementQuestion[];
  result?: string;
  requiresRefinement: boolean;
}

export interface StateTransition {
  from: ResearchSessionStatus;
  to: ResearchSessionStatus;
  condition: (session: ResearchSessionData) => boolean;
}

