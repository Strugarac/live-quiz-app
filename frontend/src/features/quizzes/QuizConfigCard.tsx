import type { FieldRequirement, QuizConfigDto } from '../../lib/api/types'
import { Checkbox, SelectField } from '../../components/ui/Field'
import { Card, CardHeader } from '../../components/ui/Feedback'
import { CONFIGURABLE_FIELDS, FIELD_REQUIREMENT_OPTIONS } from './quizLabels'

interface QuizConfigCardProps {
  config: QuizConfigDto
  onChange: (config: QuizConfigDto) => void
}

/** How the quiz is scored, what each student is asked for, and what is kept afterwards. */
export function QuizConfigCard({ config, onChange }: QuizConfigCardProps) {
  return (
    <Card>
      <CardHeader
        title="Quiz settings"
        description="How answers are treated, what each student is asked when they join, and what is kept afterwards."
      />
      <div className="space-y-5 px-5 py-4">
        <div className="space-y-4 border-b border-slate-200 pb-4">
          <h3 className="text-sm font-semibold text-slate-900">Scoring</h3>
          <Checkbox
            label="Survey mode — no right or wrong answers"
            description="On: nothing is marked correct, answers are not graded, and there is no score or leaderboard. Use it to open a discussion or run a survey — you still see how many people picked each option. Questions written this way need no correct answer marked."
            checked={config.surveyMode}
            onChange={(surveyMode) => onChange({ ...config, surveyMode })}
          />
        </div>

        <h3 className="text-sm font-semibold text-slate-900">Participant registration</h3>

        {/* Nothing in this section applies to an anonymous quiz, so say so instead of
            leaving the professor configuring fields that are never asked for. */}
        {config.saveParticipants ? (
          <div className="rounded-lg bg-slate-50 px-4 py-3 text-sm ring-1 ring-slate-200 ring-inset">
            <p className="font-medium text-slate-700">Email — always required</p>
            <p className="mt-0.5 text-xs text-slate-500">
              Email is the identity anchor used to match students against university accounts, so it
              cannot be turned off.
            </p>
          </div>
        ) : (
          <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm ring-1 ring-amber-200 ring-inset">
            <p className="font-medium text-amber-900">Nothing is asked when joining</p>
            <p className="mt-0.5 text-xs text-amber-800">
              “Keep participant identities” is off below, so students join as guests with one tap.
              The fields here are ignored until you turn it back on.
            </p>
          </div>
        )}

        <div
          className={`grid gap-4 sm:grid-cols-2 ${config.saveParticipants ? '' : 'pointer-events-none opacity-50'}`}
        >
          {CONFIGURABLE_FIELDS.map((field) => (
            <SelectField
              key={field.key}
              label={field.label}
              value={config[field.key] as FieldRequirement}
              options={FIELD_REQUIREMENT_OPTIONS}
              onChange={(event) =>
                onChange({ ...config, [field.key]: event.target.value as FieldRequirement })
              }
            />
          ))}
        </div>

        <div className="space-y-4 border-t border-slate-200 pt-4">
          <h3 className="text-sm font-semibold text-slate-900">After the session ends</h3>
          <Checkbox
            label="Keep participant identities"
            description="Off: students join with one tap as guests — no email, no name, nothing personal is ever collected — and appear as “Participant 1…N” while the quiz runs and in the results. The registration fields above are not asked for at all."
            checked={config.saveParticipants}
            onChange={(saveParticipants) => onChange({ ...config, saveParticipants })}
          />
          <Checkbox
            label="Keep results and statistics"
            description="Off: answers and participants are deleted the moment you end the session, and cannot be recovered. The end-session dialog warns you and offers the CSV export first. On: results stay until you clear them yourself from the results page."
            checked={config.saveStatistics}
            onChange={(saveStatistics) => onChange({ ...config, saveStatistics })}
          />
        </div>
      </div>
    </Card>
  )
}
