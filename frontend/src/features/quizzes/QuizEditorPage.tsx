import { useCallback, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { quizApi } from '../../lib/api/quizzes'
import { sessionApi } from '../../lib/api/sessions'
import type { QuestionResponse, QuizConfigDto, QuizResponse, QuizType } from '../../lib/api/types'
import { useAction, useAsync } from '../../lib/useAsync'
import { Button } from '../../components/ui/Button'
import { SelectField, TextArea, TextField } from '../../components/ui/Field'
import { Badge, Card, CardHeader, EmptyState, ErrorBanner, Spinner } from '../../components/ui/Feedback'
import { ConfirmDialog } from '../../components/ui/Modal'
import { QuestionForm } from './QuestionForm'
import { QuizConfigCard } from './QuizConfigCard'
import { QUESTION_TYPE_LABELS, QUIZ_TYPE_OPTIONS } from './quizLabels'

export function QuizEditorPage() {
  const { quizId = '' } = useParams()
  const quiz = useAsync(
    useCallback((signal: AbortSignal) => quizApi.get(quizId, signal), [quizId]),
  )

  if (quiz.loading) {
    return <Spinner label="Loading quiz…" />
  }
  if (quiz.error) {
    return <ErrorBanner error={quiz.error} onRetry={quiz.reload} />
  }
  if (!quiz.data) {
    return null
  }

  return <QuizEditor quiz={quiz.data} onQuizChange={quiz.setData} />
}

function QuizEditor({
  quiz,
  onQuizChange,
}: {
  quiz: QuizResponse
  onQuizChange: (quiz: QuizResponse) => void
}) {
  const navigate = useNavigate()
  const startSession = useAction(() => sessionApi.create({ quizId: quiz.id }))

  const hostSession = async () => {
    const result = await startSession.run()
    if (result.ok) {
      navigate(`/sessions/${result.value.id}`)
    }
  }

  return (
    <>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link to="/quizzes" className="text-sm font-medium text-brand-700 hover:underline">
            ← All quizzes
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">{quiz.title}</h1>
        </div>
        <Button
          variant="primary"
          pending={startSession.pending}
          disabled={quiz.questions.length === 0}
          onClick={hostSession}
        >
          Start live session
        </Button>
      </div>

      {startSession.error && (
        <div className="mb-6">
          {/* A 409 here means this quiz already has a session in LOBBY or ACTIVE. */}
          <ErrorBanner error={startSession.error} />
          {startSession.error.status === 409 && (
            <Link
              to="/sessions"
              className="mt-2 inline-block text-sm font-semibold text-brand-700 hover:underline"
            >
              Open the running session →
            </Link>
          )}
        </div>
      )}

      <div className="space-y-6">
        <DetailsSection quiz={quiz} onSaved={onQuizChange} />
        <QuestionsSection quiz={quiz} onQuizChange={onQuizChange} />
      </div>
    </>
  )
}

/**
 * Title / description / type / config are one PUT. Questions are deliberately not
 * part of it — the backend's update endpoint ignores them.
 */
function DetailsSection({
  quiz,
  onSaved,
}: {
  quiz: QuizResponse
  onSaved: (quiz: QuizResponse) => void
}) {
  const [title, setTitle] = useState(quiz.title)
  const [description, setDescription] = useState(quiz.description ?? '')
  const [type, setType] = useState<QuizType>(quiz.type)
  const [config, setConfig] = useState<QuizConfigDto>(quiz.config)
  const [savedOnce, setSavedOnce] = useState(false)

  const save = useAction(() =>
    quizApi.update(quiz.id, {
      title: title.trim(),
      description: description.trim() || null,
      type,
      config,
    }),
  )

  const dirty =
    title !== quiz.title ||
    description !== (quiz.description ?? '') ||
    type !== quiz.type ||
    JSON.stringify(config) !== JSON.stringify(quiz.config)

  // Derived rather than stored, so editing anything hides it again on its own.
  const showSaved = savedOnce && !dirty

  const submit = async () => {
    const result = await save.run()
    if (result.ok) {
      // Preserve the questions the PUT response already carries.
      onSaved(result.value)
      setSavedOnce(true)
    }
  }

  return (
    <>
      <Card>
        <CardHeader title="Details" />
        <div className="space-y-4 px-5 py-4">
          <TextField
            label="Title"
            value={title}
            maxLength={255}
            error={save.error?.fieldError('title')}
            onChange={(event) => setTitle(event.target.value)}
          />
          <TextArea
            label="Description"
            value={description}
            maxLength={2000}
            onChange={(event) => setDescription(event.target.value)}
          />
          <SelectField
            label="Type"
            value={type}
            options={QUIZ_TYPE_OPTIONS}
            onChange={(event) => setType(event.target.value as QuizType)}
          />
        </div>
      </Card>

      <QuizConfigCard config={config} onChange={setConfig} />

      {save.error && <ErrorBanner error={save.error} />}

      <div className="flex items-center justify-end gap-3">
        {showSaved && <span className="text-sm font-medium text-emerald-600">Saved</span>}
        {dirty && <span className="text-sm text-slate-500">Unsaved changes</span>}
        <Button variant="primary" pending={save.pending} disabled={!dirty} onClick={submit}>
          Save changes
        </Button>
      </div>
    </>
  )
}

function QuestionsSection({
  quiz,
  onQuizChange,
}: {
  quiz: QuizResponse
  onQuizChange: (quiz: QuizResponse) => void
}) {
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | undefined>()
  const [pendingDelete, setPendingDelete] = useState<QuestionResponse | undefined>()

  const remove = useAction((questionId: string) => quizApi.deleteQuestion(quiz.id, questionId))

  const replaceQuestion = (saved: QuestionResponse) => {
    onQuizChange({
      ...quiz,
      questions: quiz.questions.map((q) => (q.id === saved.id ? saved : q)),
    })
    setEditingId(undefined)
  }

  const appendQuestion = (saved: QuestionResponse) => {
    onQuizChange({ ...quiz, questions: [...quiz.questions, saved] })
    setAdding(false)
  }

  const confirmDelete = async () => {
    if (!pendingDelete) {
      return
    }
    const result = await remove.run(pendingDelete.id)
    if (result.ok) {
      onQuizChange({
        ...quiz,
        questions: quiz.questions.filter((q) => q.id !== pendingDelete.id),
      })
      setPendingDelete(undefined)
    }
  }

  return (
    <Card>
      <CardHeader
        title={`Questions (${quiz.questions.length})`}
        description="Questions run in the order shown. New ones are appended to the end."
        action={
          !adding && (
            <Button size="sm" variant="primary" onClick={() => setAdding(true)}>
              Add question
            </Button>
          )
        }
      />

      <div className="space-y-4 px-5 py-4">
        {quiz.questions.length === 0 && !adding && (
          <EmptyState
            title="No questions yet"
            description="A session cannot be started until the quiz has at least one question."
            action={
              <Button variant="primary" onClick={() => setAdding(true)}>
                Add the first question
              </Button>
            }
          />
        )}

        {quiz.questions.map((question, index) =>
          editingId === question.id ? (
            <QuestionForm
              key={question.id}
              quizId={quiz.id}
              question={question}
              onSaved={replaceQuestion}
              onCancel={() => setEditingId(undefined)}
            />
          ) : (
            <QuestionRow
              key={question.id}
              question={question}
              position={index + 1}
              onEdit={() => setEditingId(question.id)}
              onDelete={() => setPendingDelete(question)}
            />
          ),
        )}

        {adding && (
          <QuestionForm
            quizId={quiz.id}
            onSaved={appendQuestion}
            onCancel={() => setAdding(false)}
          />
        )}
      </div>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete question"
        pending={remove.pending}
        confirmLabel="Delete question"
        message={
          <>
            <p>Delete this question and its options?</p>
            {remove.error && <p className="mt-3 font-medium text-red-600">{remove.error.message}</p>}
          </>
        }
        onConfirm={confirmDelete}
        onCancel={() => {
          setPendingDelete(undefined)
          remove.clearError()
        }}
      />
    </Card>
  )
}

function QuestionRow({
  question,
  position,
  onEdit,
  onDelete,
}: {
  question: QuestionResponse
  position: number
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <article className="rounded-xl px-4 py-3 ring-1 ring-slate-200 ring-inset">
      <div className="flex items-start gap-4">
        <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-md bg-slate-100 text-xs font-bold text-slate-600">
          {position}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium text-slate-900">{question.text ?? '(image only)'}</p>
            <Badge tone="brand">{QUESTION_TYPE_LABELS[question.type]}</Badge>
          </div>

          {question.imageUrl && (
            <img
              src={question.imageUrl}
              alt=""
              className="mt-2 h-20 rounded bg-slate-50 object-contain ring-1 ring-slate-200 ring-inset"
            />
          )}

          {question.options.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {question.options.map((option) => (
                <li
                  key={option.id}
                  className={`rounded-md px-2 py-1 text-xs ${
                    option.correct
                      ? 'bg-emerald-50 font-semibold text-emerald-800 ring-1 ring-emerald-200 ring-inset'
                      : 'bg-slate-50 text-slate-600'
                  }`}
                >
                  {option.correct && <span aria-label="Correct answer">✓ </span>}
                  {option.text ?? '(image)'}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex shrink-0 gap-1">
          <Button size="sm" variant="ghost" onClick={onEdit}>
            Edit
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onDelete}
            className="text-red-600 hover:bg-red-50"
          >
            Delete
          </Button>
        </div>
      </div>
    </article>
  )
}
