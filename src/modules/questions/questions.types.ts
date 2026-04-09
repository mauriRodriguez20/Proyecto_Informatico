import { Area } from "@prisma/client";

export type VoteValue = 1 | -1;

export interface AuthorSnapshot {
  id: string;
  username: string;
  avatarUrl: string | null;
  role: string;
}

export interface QuestionTagItem {
  technologyId: string;
}

export interface AnswerVoteItem {
  id: string;
  answerId: string;
  voterId: string;
  value: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AnswerItem {
  id: string;
  questionId: string;
  authorId: string;
  content: string;
  codeBlock: string | null;
  language: string | null;
  isAccepted: boolean;
  voteScore: number;
  createdAt: Date;
  updatedAt: Date;
  votes?: AnswerVoteItem[];
  author?: AuthorSnapshot | null;
}

export interface QuestionItem {
  id: string;
  authorId: string;
  area: Area;
  title: string;
  description: string;
  codeBlock: string | null;
  language: string | null;
  createdAt: Date;
  updatedAt: Date;
  tags: QuestionTagItem[];
  answers?: AnswerItem[];
  author?: AuthorSnapshot | null;
}

export interface QuestionListItem extends QuestionItem {
  answerCount: number;
  acceptedAnswerId: string | null;
}

export interface CreateQuestionInput {
  area: Area;
  title: string;
  description: string;
  codeBlock?: string;
  language?: string;
  technologyIds: string[];
}

export type SortOrder = "asc" | "desc";

export interface ListQuestionsQuery {
  page: number;
  limit: number;
  unanswered: boolean;
  sortOrder: SortOrder;
}

export interface CreateAnswerInput {
  content: string;
  codeBlock?: string;
  language?: string;
}

export interface UpdateAnswerInput {
  content?: string;
  codeBlock?: string | null;
  language?: string | null;
}

export interface PaginatedQuestionsResponse {
  data: QuestionListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ErrorResponse {
  error: string;
  details?: string;
}

