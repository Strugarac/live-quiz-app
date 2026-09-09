import { useCallback, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { quizApi } from '../../lib/api/quizzes'
import { sessionApi } from '../../lib/api/sessions'
import type { QuestionResponse, QuizConfigDto, QuizResponse, QuizType } from '../../lib/api/types'
import { useAction, useAsync } from '../../lib/useAsync'
import { useToast } from '../../lib/useToast'
import { Button } from '../../components/ui/Button'
import { SelectField, TextArea, TextField } from '../../components/ui/Field'
import { Badge, Card, CardHeader, EmptyState, ErrorBanner, Spinner } from '../../components/ui/Feedback'
import { ConfirmDialog } from '../../components/ui/Modal'
import { Toast } from '../../components/ui/Toast'
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
  const toast = useToast()
  const details = useQuizDetailsForm(quiz, onQuizChange, toast.show)
  const startSession = useAction(() => sessionApi.create({ quizId: quiz.id }))

  const hostSession = async () => {
    const result = await startSession.run()
    if (result.ok) {
      navigate(`/sessions/${result.value.id}`)
    }
  }

  // A session runs against what the server has, so hosting on top of unsaved edits would
  // quietly run the old settings — the professor would be looking at survey mode on screen
  // and grading answers underneath.
  const startBlockedBy = details.dirty
    ? 'Save or discard your changes first'
    : quiz.questions.length === 0
      ? 'Add a question first'
      : undefined

  return (
    <>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link to="/quizzes" className="text-sm font-medium text-brand-700 hover:underline">
            ← All quizzes
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">{quiz.title}</h1>
        </div>
        <div className="text-right">
          <Button
            variant="primary"
            pending={startSession.pending}
            disabled={Boolean(startBlockedBy)}
            onClick={hostSession}
          >
            Start live session
          </Button>
          {/* A disabled button with nothing saying why is the thing being fixed here. */}
          {startBlockedBy && (
            <p
              className={`mt-1.5 text-xs font-medium ${
                details.dirty ? 'text-amber-700' : 'text-slate-500'
              }`}
            >
              {startBlockedBy}
            </p>
          )}
        </div>
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
        <DetailsSection form={details} />
        <QuestionsSection quiz={quiz} onQuizChange={onQuizChange} />
      </div>

      <Toast message={toast.message} />
    </>
  )
}

/**
 * Title / description / type / config are one PUT. Questions are deliberately not
 * part of it — the backend's update endpoint ignores them.
 *
 * The form state lives up here rather than inside the section that renders it, because
 * "there are unsaved changes" also governs the Start button at the top of the page.
 */
function useQuizDetailsForm(
  quiz: QuizResponse,
  onSaved: (quiz: QuizResponse) => void,
  onToast: (text: string) => void,
) {
  const [title, setTitle] = useState(quiz.title)
  const [description, setDescription] = useState(quiz.description ?? '')
  const [type, setType] = useState<QuizType>(quiz.type)
  const [config, setConfig] = useState<QuizConfigDto>(quiz.config)

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

  /** Adopt whatever the server holds — what both saving and discarding end at. */
  const reset = (source: QuizResponse) => {
    setTitle(source.title)
    setDescription(source.description ?? '')
    setType(source.type)
    setConfig(source.config)
    save.clearError()
  }

  const submit = async () => {
    const result = await save.run()
    if (result.ok) {
      // Preserve the questions the PUT response already carries.
      onSaved(result.value)
      // Re-seed from the response, not from what was typed: the PUT trims, so a title left
      // with a trailing space would otherwise stay "dirty" forever against the saved value.
      reset(result.value)
      onToast('Quiz settings saved')
    }
  }

  const discard = () => reset(quiz)

  return {
    title,
    setTitle,
    description,
    setDescription,
    type,
    setType,
    config,
    setConfig,
    dirty,
    save,
    submit,
    discard,
  }
}

type QuizDetailsForm = ReturnType<typeof useQuizDetailsForm>

function DetailsSection({ form }: { form: QuizDetailsForm }) {
  return (
    <>
      <Card>
        <CardHeader title="Details" />
        <div className="space-y-4 px-5 py-4">
          <TextField
            label="Title"
            value={form.title}
            maxLength={255}
            error={form.save.error?.fieldError('title')}
            onChange={(event) => form.setTitle(event.target.value)}
          />
          <TextArea
            label="Description"
            value={form.description}
            maxLength={2000}
            onChange={(event) => form.setDescription(event.target.value)}
          />
          <SelectField
            label="Type"
            value={form.type}
            options={QUIZ_TYPE_OPTIONS}
            hint="Flexible lets you choose each question during the session and add new ones as you go. Cannot be changed while a session is running."
            onChange={(event) => form.setType(event.target.value as QuizType)}
          />
        </div>
      </Card>

      <QuizConfigCard config={form.config} onChange={form.setConfig} />

      {form.save.error && <ErrorBanner error={form.save.error} />}

      {/* Sticky, not parked at the bottom of the form: the setting that made this appear is
          often several screens above the button that resolves it. It exists only while there
          is something to resolve, so its presence is itself the warning. */}
      {form.dirty && (
        <div className="sticky bottom-4 z-30 flex flex-wrap items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-lg ring-1 ring-amber-300 ring-inset">
          <span className="mr-auto text-sm font-medium text-amber-700">
            You have unsaved changes
          </span>
          <Button variant="ghost" disabled={form.save.pending} onClick={form.discard}>
            Discard
          </Button>
          <Button variant="primary" pending={form.save.pending} onClick={form.submit}>
            Save changes
          </Button>
        </div>
      )}
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
              surveyMode={quiz.config.surveyMode}
              onSaved={replaceQuestion}
              onCancel={() => setEditingId(undefined)}
            />
          ) : (
            <QuestionRow
              key={question.id}
              question={question}
              position={index + 1}
              surveyMode={quiz.config.surveyMode}
              onEdit={() => setEditingId(question.id)}
              onDelete={() => setPendingDelete(question)}
            />
          ),
        )}

        {adding && (
          <QuestionForm
            quizId={quiz.id}
            surveyMode={quiz.config.surveyMode}
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
  surveyMode,
  onEdit,
  onDelete,
}: {
  question: QuestionResponse
  position: number
  surveyMode: boolean
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
              {question.options.map((option) => {
                // Survey mode ignores the stored correct flags, so showing one here would
                // claim a right answer the session will never reveal.
                const showAsCorrect = option.correct && !surveyMode
                return (
                  <li
                    key={option.id}
                    className={`rounded-md px-2 py-1 text-xs ${
                      showAsCorrect
                        ? 'bg-emerald-50 font-semibold text-emerald-800 ring-1 ring-emerald-200 ring-inset'
                        : 'bg-slate-50 text-slate-600'
                    }`}
                  >
                    {showAsCorrect && <span aria-label="Correct answer">✓ </span>}
                    {option.text ?? '(image)'}
                  </li>
                )
              })}
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
