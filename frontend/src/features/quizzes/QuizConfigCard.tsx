import type { FieldRequirement, QuizConfigDto } from '../../lib/api/types'
import { Checkbox, SelectField } from '../../components/ui/Field'
import { Card, CardHeader } from '../../components/ui/Feedback'
import { CONFIGURABLE_FIELDS, FIELD_REQUIREMENT_OPTIONS } from './quizLabels'

interface QuizConfigCardProps {
  config: QuizConfigDto
  onChange: (config: QuizConfigDto) => void
}

/** Participant registration fields + what happens to the data after a session. */
export function QuizConfigCard({ config, onChange }: QuizConfigCardProps) {
  return (
    <Card>
      <CardHeader
        title="Participant registration"
        description="What each student is asked for when they join a session from this quiz."
      />
      <div className="space-y-5 px-5 py-4">
        <div className="rounded-lg bg-slate-50 px-4 py-3 text-sm ring-1 ring-slate-200 ring-inset">
          <p className="font-medium text-slate-700">Email — always required</p>
          <p className="mt-0.5 text-xs text-slate-500">
            Email is the identity anchor used to match students against university accounts, so it
            cannot be turned off.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
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
            description="Off: names, student numbers and faculties are wiped the moment the session ends, and results show anonymous “Participant 1…N” labels instead."
            checked={config.saveParticipants}
            onChange={(saveParticipants) => onChange({ ...config, saveParticipants })}
          />
          <Checkbox
            label="Keep results and statistics"
            description="Off: the round is meant to be discarded. Nothing is deleted automatically — you can still view and export the results, then clear them yourself."
            checked={config.saveStatistics}
            onChange={(saveStatistics) => onChange({ ...config, saveStatistics })}
          />
        </div>
      </div>
    </Card>
  )
}
