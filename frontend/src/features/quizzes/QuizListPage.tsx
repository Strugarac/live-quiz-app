import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { quizApi } from '../../lib/api/quizzes'
import type { QuizSummary, QuizType, UUID } from '../../lib/api/types'
import { useAction, useAsync } from '../../lib/useAsync'
import { Button } from '../../components/ui/Button'
import { SelectField, TextArea, TextField } from '../../components/ui/Field'
import { Badge, Card, EmptyState, ErrorBanner, Spinner } from '../../components/ui/Feedback'
import { ConfirmDialog, Modal } from '../../components/ui/Modal'
import { DEFAULT_CONFIG, QUIZ_TYPE_LABELS, QUIZ_TYPE_OPTIONS, formatDate } from './quizLabels'

/**
 * Optional filters live behind the "Add filter" button so the toolbar stays a
 * plain search box until someone asks for more. Adding another filter later is
 * four edits: a key here, its state, its control in `renderFilter`, and a
 * clause in `visible`.
 */
const FILTER_LABELS = { type: 'Type', questions: 'Number of questions' } as const

type FilterKey = keyof typeof FILTER_LABELS

const FILTER_KEYS = Object.keys(FILTER_LABELS) as FilterKey[]

const SORT_OPTIONS = [
  { value: 'NEWEST', label: 'Newest first' },
  { value: 'OLDEST', label: 'Oldest first' },
]

type Sort = 'NEWEST' | 'OLDEST'

export function QuizListPage() {
  const quizzes = useAsync(useCallback((signal: AbortSignal) => quizApi.list(signal), []))
  const [creating, setCreating] = useState(false)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<QuizType | 'ALL'>('ALL')
  // Kept as strings: an empty box means "no bound", which a number cannot express.
  const [minQuestions, setMinQuestions] = useState('')
  const [maxQuestions, setMaxQuestions] = useState('')
  // Which optional filters the user has pulled in, in the order they added them.
  const [activeFilters, setActiveFilters] = useState<FilterKey[]>([])
  // The endpoint already returns newest first, so this is the default.
  const [sort, setSort] = useState<Sort>('NEWEST')
  const [pendingDelete, setPendingDelete] = useState<QuizSummary | undefined>()

  const remove = useAction(quizApi.remove)
  const copy = useAction(quizApi.copy)
  // Which row is being copied, so only that button shows a spinner.
  const [copyingId, setCopyingId] = useState<UUID | undefined>()

  const duplicate = async (quiz: QuizSummary) => {
    setCopyingId(quiz.id)
    const result = await copy.run(quiz.id)
    setCopyingId(undefined)
    if (result.ok) {
      // The copy is the newest quiz, so the list — newest first — puts it at the top.
      quizzes.reload()
    }
  }

  // The list is small enough to filter in the browser — no need to refetch per keystroke.
  const query = search.trim().toLowerCase()
  // NaN for a blank or half-typed box, which every comparison below reads as "no bound".
  const min = Number.parseInt(minQuestions, 10)
  const max = Number.parseInt(maxQuestions, 10)
  const filtering =
    query.length > 0 || typeFilter !== 'ALL' || !Number.isNaN(min) || !Number.isNaN(max)

  const visible = useMemo(
    () =>
      // `filter` already hands back a copy, so sorting it in place is safe.
      (quizzes.data ?? [])
        .filter(
          (quiz) =>
            (query.length === 0 || quiz.title.toLowerCase().includes(query)) &&
            (typeFilter === 'ALL' || quiz.type === typeFilter) &&
            (Number.isNaN(min) || quiz.questionCount >= min) &&
            (Number.isNaN(max) || quiz.questionCount <= max),
        )
        .sort((a, b) => {
          const difference = Date.parse(a.createdAt) - Date.parse(b.createdAt)
          return sort === 'NEWEST' ? -difference : difference
        }),
    [quizzes.data, query, typeFilter, min, max, sort],
  )

  // Removing a filter has to reset its value too, or it would keep filtering
  // from behind a control that is no longer on screen.
  const removeFilter = (key: FilterKey) => {
    setActiveFilters((current) => current.filter((active) => active !== key))
    if (key === 'type') {
      setTypeFilter('ALL')
    }
    if (key === 'questions') {
      setMinQuestions('')
      setMaxQuestions('')
    }
  }

  const toggleFilter = (key: FilterKey) => {
    if (activeFilters.includes(key)) {
      removeFilter(key)
    } else {
      setActiveFilters((current) => [...current, key])
    }
  }

  const clearFilters = () => {
    setSearch('')
    setTypeFilter('ALL')
    setMinQuestions('')
    setMaxQuestions('')
    setActiveFilters([])
  }

  // Rendered in the order the filters were added, so the toolbar does not
  // reshuffle itself when one is removed and added back.
  const renderFilter = (key: FilterKey) => {
    if (key === 'type') {
      return (
        <div className="flex-1">
          <SelectField
            label={FILTER_LABELS.type}
            value={typeFilter}
            options={[{ value: 'ALL', label: 'All types' }, ...QUIZ_TYPE_OPTIONS]}
            onChange={(event) => setTypeFilter(event.target.value as QuizType | 'ALL')}
          />
        </div>
      )
    }
    return (
      <div className="flex flex-1 gap-2">
        <div className="flex-1">
          <TextField
            label="Questions from"
            type="number"
            min={0}
            inputMode="numeric"
            value={minQuestions}
            placeholder="any"
            onChange={(event) => setMinQuestions(event.target.value)}
          />
        </div>
        <div className="flex-1">
          <TextField
            label="to"
            type="number"
            min={0}
            inputMode="numeric"
            value={maxQuestions}
            placeholder="any"
            onChange={(event) => setMaxQuestions(event.target.value)}
          />
        </div>
      </div>
    )
  }

  const confirmDelete = async () => {
    if (!pendingDelete) {
      return
    }
    const result = await remove.run(pendingDelete.id)
    if (result.ok) {
      setPendingDelete(undefined)
      // Same as the sessions list: drop the row locally, no refetch. See the comment there.
      quizzes.setData((quizzes.data ?? []).filter((row) => row.id !== pendingDelete.id))
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

      {/* A failed copy leaves the list untouched, so this is the only sign of it. */}
      {copy.error && (
        <div className="mb-4">
          <ErrorBanner error={copy.error} />
        </div>
      )}

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
        <div className="mb-4">
          {/* The match count rides with the button so nothing comes between the
              search box and the table. */}
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex items-center gap-3">
              <AddFilterMenu active={activeFilters} onToggle={toggleFilter} />
              {filtering && (
                <p className="text-xs text-slate-500">
                  {visible.length} of {quizzes.data.length} quizzes match
                </p>
              )}
            </div>
            <div className="w-44">
              <SelectField
                label="Sort by created"
                value={sort}
                options={SORT_OPTIONS}
                onChange={(event) => setSort(event.target.value as Sort)}
              />
            </div>
          </div>

          {/* Added filters stack above the search box, which stays the last
              control before the table. */}
          <div className="mt-3 flex w-full flex-col gap-3 sm:w-80">
            {activeFilters.map((key) => (
              <div key={key} className="flex items-end gap-1">
                {renderFilter(key)}
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label={`Remove ${FILTER_LABELS[key]} filter`}
                  onClick={() => removeFilter(key)}
                  className="text-slate-400 hover:text-red-600"
                >
                  ✕
                </Button>
              </div>
            ))}

            <div>
              <TextField
                label="Search"
                type="search"
                value={search}
                placeholder="Filter by title…"
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </div>
        </div>
      )}

      {quizzes.data && quizzes.data.length > 0 && visible.length === 0 && (
        <EmptyState
          title="No quizzes match your filters"
          description={
            activeFilters.length > 0
              ? 'Try a different title, or widen the filters you added.'
              : 'No quiz title contains what you typed.'
          }
          action={
            <Button variant="ghost" onClick={clearFilters}>
              Clear filters
            </Button>
          }
        />
      )}

      {visible.length > 0 && (
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
                {visible.map((quiz) => (
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
                        pending={copyingId === quiz.id}
                        disabled={copy.pending}
                        onClick={() => void duplicate(quiz)}
                      >
                        Copy
                      </Button>
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
 * Checklist of every filter. It stays open while boxes are ticked so several
 * filters can be picked in one go, and each one shows up on the toolbar the
 * moment it is ticked.
 */
function AddFilterMenu({
  active,
  onToggle,
}: {
  active: FilterKey[]
  onToggle: (key: FilterKey) => void
}) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) {
      return
    }
    const onPointerDown = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div ref={root} className="relative">
      <Button
        size="sm"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        + Add filter{active.length > 0 && ` (${active.length})`}
      </Button>
      {open && (
        // A plain group, not role="menu": menus expect menuitem children, and
        // these are real checkboxes so several can be ticked without closing.
        <div
          role="group"
          aria-label="Filters"
          className="absolute left-0 z-20 mt-1 w-56 rounded-lg bg-white py-1 shadow-lg ring-1 ring-slate-200"
        >
          {FILTER_KEYS.map((key) => (
            <label
              key={key}
              className="flex cursor-pointer items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              <input
                type="checkbox"
                checked={active.includes(key)}
                onChange={() => onToggle(key)}
                className="size-4 shrink-0 rounded border-slate-300 text-brand-600 accent-brand-600"
              />
              {FILTER_LABELS[key]}
            </label>
          ))}
        </div>
      )}
    </div>
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
