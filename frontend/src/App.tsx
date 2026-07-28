import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { AuthProvider, RequireAuth } from './auth/AuthProvider'
import { AppLayout } from './components/AppLayout'
import { QuizEditorPage } from './features/quizzes/QuizEditorPage'
import { QuizListPage } from './features/quizzes/QuizListPage'

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
          {/* Professor console. The participant client (/join/:token) lands in slice 9c
              outside this layout, since students get a different, mobile-first shell. */}
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
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
