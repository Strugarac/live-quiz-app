import { useCallback, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { quizApi } from '../../lib/api/quizzes'
import type { QuizSummary, QuizType } from '../../lib/api/types'
import { useAction, useAsync } from '../../lib/useAsync'
import { Button } from '../../components/ui/Button'
import { SelectField, TextArea, TextField } from '../../components/ui/Field'
import { Badge, Card, EmptyState, ErrorBanner, Spinner } from '../../components/ui/Feedback'
import { ConfirmDialog, Modal } from '../../components/ui/Modal'
import { DEFAULT_CONFIG, QUIZ_TYPE_LABELS, QUIZ_TYPE_OPTIONS, formatDate } from './quizLabels'

export function QuizListPage() {
  const quizzes = useAsync(useCallback((signal: AbortSignal) => quizApi.list(signal), []))
  const [creating, setCreating] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<QuizSummary | undefined>()

  const remove = useAction(quizApi.remove)

  const confirmDelete = async () => {
    if (!pendingDelete) {
      return
    }
    const result = await remove.run(pendingDelete.id)
    if (result.ok) {
      setPendingDelete(undefined)
      quizzes.reload()
    }
  }

  return (
    <>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Quizzes</h1>
          <p className="mt-1 text-sm text-slate-500">
            Author quiz templates here, then start a live session from one.
          </p>
        </div>
        <Button variant="primary" onClick={() => setCreating(true)}>
          New quiz
        </Button>
      </div>

      {quizzes.loading && <Spinner label="Loading quizzes…" />}

      {quizzes.error && <ErrorBanner error={quizzes.error} onRetry={quizzes.reload} />}

      {quizzes.data?.length === 0 && (
        <EmptyState
          title="No quizzes yet"
          description="Create your first quiz template, add some questions, and you will be able to host a live session from it."
          action={
            <Button variant="primary" onClick={() => setCreating(true)}>
              New quiz
            </Button>
          }
        />
      )}

      {quizzes.data && quizzes.data.length > 0 && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Title</th>
                  <th className="px-5 py-3 font-semibold">Type</th>
                  <th className="px-5 py-3 font-semibold">Questions</th>
                  <th className="px-5 py-3 font-semibold">Sessions</th>
                  <th className="px-5 py-3 font-semibold">Created</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {quizzes.data.map((quiz) => (
                  <tr key={quiz.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3">
                      <Link
                        to={`/quizzes/${quiz.id}`}
                        className="font-semibold text-brand-700 hover:underline"
                      >
                        {quiz.title}
                      </Link>
                    </td>
                    <td className="px-5 py-3">
                      <Badge tone={quiz.type === 'FLEXIBLE' ? 'amber' : 'slate'}>
                        {QUIZ_TYPE_LABELS[quiz.type]}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-slate-600">{quiz.questionCount}</td>
                    <td className="px-5 py-3 text-slate-600">{quiz.sessionCount}</td>
                    <td className="px-5 py-3 text-slate-500">{formatDate(quiz.createdAt)}</td>
                    <td className="px-5 py-3 text-right whitespace-nowrap">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setPendingDelete(quiz)}
                        className="text-red-600 hover:bg-red-50"
                      >
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <NewQuizModal open={creating} onClose={() => setCreating(false)} />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete quiz"
        pending={remove.pending}
        confirmLabel="Delete quiz"
        message={
          <>
            <p>
              Delete <strong>{pendingDelete?.title}</strong> and all of its questions?
            </p>
            {pendingDelete !== undefined && pendingDelete.sessionCount > 0 && (
              <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-amber-900 ring-1 ring-amber-200 ring-inset">
                This quiz has been hosted{' '}
                <strong>
                  {pendingDelete.sessionCount} {pendingDelete.sessionCount === 1 ? 'time' : 'times'}
                </strong>
                . Those sessions, their participants and all of their results will be deleted too —
                export any CSV you still need first.
              </p>
            )}
            <p className="mt-2 text-slate-500">This cannot be undone.</p>
            {remove.error && <p className="mt-3 font-medium text-red-600">{remove.error.message}</p>}
          </>
        }
        onConfirm={confirmDelete}
        onCancel={() => {
          setPendingDelete(undefined)
          remove.clearError()
        }}
      />
    </>
  )
}

/**
 * Creating a quiz only asks for the essentials — participant fields, data
 * retention and questions are all edited on the quiz page afterwards.
 */
function NewQuizModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<QuizType>('STATIC')

  const create = useAction(quizApi.create)

  const submit = async () => {
    const result = await create.run({
      title: title.trim(),
      description: description.trim() || null,
      type,
      config: DEFAULT_CONFIG,
    })
    if (result.ok) {
      navigate(`/quizzes/${result.value.id}`)
    }
  }

  return (
    <Modal
      open={open}
      title="New quiz"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={create.pending}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={submit}
            pending={create.pending}
            disabled={title.trim().length === 0}
          >
            Create and add questions
          </Button>
        </>
      }
    >
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
      >
        {create.error && <ErrorBanner error={create.error} />}
        <TextField
          label="Title"
          value={title}
          maxLength={255}
          autoFocus
          placeholder="e.g. Databases — Week 4"
          error={create.error?.fieldError('title')}
          onChange={(event) => setTitle(event.target.value)}
        />
        <TextArea
          label="Description"
          value={description}
          maxLength={2000}
          hint="Optional. Only you see this."
          error={create.error?.fieldError('description')}
          onChange={(event) => setDescription(event.target.value)}
        />
        <SelectField
          label="Type"
          value={type}
          options={QUIZ_TYPE_OPTIONS}
          hint="Static runs the questions in a fixed order. Flexible lets you choose each question while the session runs, and add new ones as you go."
          onChange={(event) => setType(event.target.value as QuizType)}
        />
        {/* Lets Enter submit the form without adding a stray visible button. */}
        <button type="submit" className="hidden" aria-hidden="true" />
      </form>
    </Modal>
  )
}
