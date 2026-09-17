export interface H5PAnswer {
  id: string;
  text: string;
  correct: boolean;
  /** Ancien champ importé de Quiz Wizard : lecture seule, ne plus écrire. */
  isCorrect?: boolean;
  feedback?: string;
  tip?: string;
}

export interface H5PQuestion {
  id: string;
  question: string;
  type: 'multichoice' | 'truefalse';
  answers: H5PAnswer[];
  explanation?: string;
  feedbackCorrect?: string;
  feedbackIncorrect?: string;
}

export interface H5PCard {
  id: string;
  front: string;
  back: string;
  hint?: string;
}

export interface ScoreTier {
  min: number;
  max: number;
  feedback: string;
}

export interface H5POptions {
  correctionMode?: 'immediate' | 'end';
  randomizeQuestions?: boolean;
  randomizeAnswers?: boolean;
  showH5PActionBar?: boolean;
  showDownloadButton?: boolean;
  showEmbedButton?: boolean;
  showCopyrightButton?: boolean;
  passPercentage?: number;
  scoreTiers?: ScoreTier[];
}

export interface H5PQuiz {
  id: string;
  type: 'quiz' | 'flashcards';
  title: string;
  theme?: string;
  description?: string;
  content: {
    questions?: H5PQuestion[];
    cards?: H5PCard[];
  };
  options?: H5POptions;
  created_at?: string;
  total_questions?: number;
  total_answers?: number;
  feedbacks_configured?: number;
}

export type AppView = 'list' | 'prompt' | 'control' | 'export' | 'feedback' | 'play';
