import type { QuestionResponse, UUID } from '../../lib/api/types'
import { Button } from '../../components/ui/Button'
import { Card, CardHeader } from '../../components/ui/Feedback'
import { QUESTION_TYPE_LABELS } from '../quizzes/quizLabels'

interface QuestionPickerPanelProps {
  /** Questions this session has not presented yet, in quiz order. */
  remaining: QuestionResponse[]
  /** Which one is being opened, so only that row shows a pending state. */
  openingId: UUID | undefined
  pending: boolean
  onOpen: (questionId: UUID) => void
  onAdd: () => void
}

/**
 * The flexible-quiz control: the host picks what participants see next instead of walking
 * a fixed order. Only unasked questions are offered — reopening one would reopen scoring
 * state that has already been closed, which is the same reason there is no way back to a
 * previous question.
 */
export function QuestionPickerPanel({
  remaining,
  openingId,
  pending,
  onOpen,
  onAdd,
}: QuestionPickerPanelProps) {
  return (
    <Card className="overflow-hidden">
      <CardHeader
        title="Choose the next question"
        description={
          remaining.length > 0
            ? 'Participants are waiting. They see it the moment you open it.'
            : undefined
        }
        action={
          <Button size="sm" onClick={onAdd}>
            + Add question
          </Button>
        }
      />

      {remaining.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-slate-500">
          Every question has been asked. Add another one, or end the session to publish the
          results.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {remaining.map((question) => (
            <li
              key={question.id}
              className="flex items-center justify-between gap-4 px-5 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-800">
                  {question.text ?? '(image only)'}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {QUESTION_TYPE_LABELS[question.type]} · {question.options.length} option
                  {question.options.length === 1 ? '' : 's'}
                </p>
              </div>
              <Button
                size="sm"
                variant="primary"
                pending={pending && openingId === question.id}
                disabled={pending && openingId !== question.id}
                onClick={() => onOpen(question.id)}
              >
                Ask this
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
