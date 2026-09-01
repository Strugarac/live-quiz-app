import { request } from './client'
import type {
  CreateQuizRequest,
  QuestionRequest,
  QuestionResponse,
  QuizResponse,
  QuizSummary,
  UpdateQuizRequest,
  UUID,
} from './types'

/** Mirrors ProfessorQuizController (/api/professor/quizzes). */
export const quizApi = {
  list: (signal?: AbortSignal) => request<QuizSummary[]>('/professor/quizzes', { signal }),

  get: (quizId: UUID, signal?: AbortSignal) =>
    request<QuizResponse>(`/professor/quizzes/${quizId}`, { signal }),

  create: (body: CreateQuizRequest) =>
    request<QuizResponse>('/professor/quizzes', { method: 'POST', body }),

  /** Deep-copies the quiz and its questions into a new "… COPY" template. */
  copy: (quizId: UUID) =>
    request<QuizResponse>(`/professor/quizzes/${quizId}/copy`, { method: 'POST' }),

  /** Note: does NOT touch questions — those have their own endpoints. */
  update: (quizId: UUID, body: UpdateQuizRequest) =>
    request<QuizResponse>(`/professor/quizzes/${quizId}`, { method: 'PUT', body }),

  remove: (quizId: UUID) =>
    request<void>(`/professor/quizzes/${quizId}`, { method: 'DELETE' }),

  addQuestion: (quizId: UUID, body: QuestionRequest) =>
    request<QuestionResponse>(`/professor/quizzes/${quizId}/questions`, { method: 'POST', body }),

  updateQuestion: (quizId: UUID, questionId: UUID, body: QuestionRequest) =>
    request<QuestionResponse>(`/professor/quizzes/${quizId}/questions/${questionId}`, {
      method: 'PUT',
      body,
    }),

  deleteQuestion: (quizId: UUID, questionId: UUID) =>
    request<void>(`/professor/quizzes/${quizId}/questions/${questionId}`, { method: 'DELETE' }),
}
