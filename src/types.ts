export interface UserProgress {
  ci: string; // Primary Key
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  empresa: string;
  planta: string;
  rol: 'visita' | 'general' | 'conductor' | 'autorizante' | 'contratista' | 'soboce';
  
  // Progress tracking: tracks percent watched (0-100) per video ID
  videoProgress: { [videoId: string]: number }; 
  
  // Quiz results and status
  examAttempts: { [examId: string]: ExamAttempt[] };
  
  // Lockout timestamp (ISO string) when failed a limit
  lockoutUntil: string | null;
  
  // Specific markers
  rucGenerated?: boolean;
  contratistaTipo?: 'I' | 'II' | 'III' | null;
  inductionVideosCompleted?: boolean;
  autorizanteVideosCompleted?: boolean;
  inductionVisualizacionSynced?: boolean;
  autorizanteVisualizacionSynced?: boolean;
}

export interface ExamAttempt {
  score: number; // Percent correct (0-100)
  passed: boolean;
  date: string; // ISO string
  submittedAnswers: { [questionId: string]: any };
}

export interface Video {
  id: string;
  title: string;
  description: string;
  youtubeId: string;
  duration: number; // in seconds
  roleRequirement: 'visita' | 'general' | 'conductor' | 'autorizante' | 'contratista' | 'soboce' | 'all';
}

export interface Question {
  id: string;
  text: string;
  type: 'multiple-choice' | 'true-false';
  options?: string[]; // required for multiple-choice
  correctAnswers: number[] | boolean; // indices of correct answers for multiselect, or boolean for T/F
  image?: string; // Optional illustration helper
}

export interface Exam {
  id: string;
  title: string;
  questions: Question[];
  passingScore: number; // e.g. 90 for 90%
}
