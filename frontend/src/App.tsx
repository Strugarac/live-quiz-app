import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { AuthProvider, RequireAuth } from './auth/AuthProvider'
import { AppLayout } from './components/AppLayout'
import { JoinPage } from './features/join/JoinPage'
import { QuizEditorPage } from './features/quizzes/QuizEditorPage'
import { QuizListPage } from './features/quizzes/QuizListPage'
import { HostSessionPage } from './features/sessions/HostSessionPage'
import { SessionResultsPage } from './features/sessions/SessionResultsPage'
import { SessionsListPage } from './features/sessions/SessionsListPage'

function NotFound() {
  return (
    <div className="py-20 text-center">
      <p className="text-sm font-semibold text-brand-700">404</p>
      <h1 className="mt-2 text-2xl font-bold text-slate-900">Page not found</h1>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Participant client. Deliberately outside the professor layout and RequireAuth:
              students arrive from a QR code with only a join token, never a login. This is
              the URL the backend builds from app.join-base-url. */}
          <Route path="join/:joinToken" element={<JoinPage />} />

          {/* Professor console. */}
          <Route
            element={
              <RequireAuth>
                <AppLayout />
              </RequireAuth>
            }
          >
            <Route index element={<Navigate to="/quizzes" replace />} />
            <Route path="quizzes" element={<QuizListPage />} />
            <Route path="quizzes/:quizId" element={<QuizEditorPage />} />
            <Route path="sessions" element={<SessionsListPage />} />
            <Route path="sessions/:sessionId" element={<HostSessionPage />} />
            <Route path="sessions/:sessionId/results" element={<SessionResultsPage />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
