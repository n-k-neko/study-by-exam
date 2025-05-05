export type ExamCategory = {
  id: string;
  name: string;
  description: string;
};

export type ExamQuestion = {
  id: string;
  categoryId: string;
  questionNumber: string;
  questionText: string;
  choices: string[];
  correctAnswer: number;
  explanation: string;
  createdAt: string;
  updatedAt: string;
};

export type UserExamProgress = {
  userId: string;
  questionId: string;
  isCorrect: boolean;
  lastAttemptedAt: string;
};

export type ExamQuestionProposal = {
  id: string;
  userId: string;
  categoryId: string;
  questionNumber: string;
  reason?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
}; 