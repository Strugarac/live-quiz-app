import { useState } from 'react'
import { joinApi } from '../../lib/api/join'
import type {
  FieldRequirement,
  JoinInfoResponse,
  JoinRequest,
  ParticipantResponse,
} from '../../lib/api/types'
import { useAction } from '../../lib/useAsync'
import { Button } from '../../components/ui/Button'
import { TextField } from '../../components/ui/Field'
import { ErrorBanner } from '../../components/ui/Feedback'

type FieldKey = 'name' | 'surname' | 'personalNumber' | 'faculty'

const FIELD_LABELS: Record<FieldKey, string> = {
  name: 'First name',
  surname: 'Surname',
  personalNumber: 'Student number',
  faculty: 'Faculty',
}

interface RegistrationFormProps {
  joinToken: string
  info: JoinInfoResponse
  onJoined: (participant: ParticipantResponse) => void
}

const EMPTY_JOIN: JoinRequest = {
  email: null,
  name: null,
  surname: null,
  personalNumber: null,
  faculty: null,
}

/**
 * Only renders the fields this quiz asks for: HIDDEN fields are dropped entirely (the
 * backend nulls them anyway) and REQUIRED ones are enforced here as well as server-side.
 * Email is required wherever identities are kept — it is the identity anchor for
 * university accounts — and asked for nowhere else.
 */
export function RegistrationForm({ joinToken, info, onJoined }: RegistrationFormProps) {
  if (info.anonymous) {
    return <GuestJoin joinToken={joinToken} onJoined={onJoined} />
  }
  return <IdentifiedJoin joinToken={joinToken} info={info} onJoined={onJoined} />
}

/**
 * The quiz keeps no identities, so there is nothing to ask: one tap and the student is in,
 * known to the professor only as "Participant N".
 */
function GuestJoin({
  joinToken,
  onJoined,
}: Omit<RegistrationFormProps, 'info'>) {
  const join = useAction(() => joinApi.join(joinToken, EMPTY_JOIN))

  const submit = async () => {
    const result = await join.run()
    if (result.ok) {
      onJoined(result.value)
    }
  }

  return (
    <div className="space-y-4">
      {join.error && <ErrorBanner error={join.error} />}

      <div className="rounded-xl bg-slate-50 px-4 py-3 text-center text-sm text-slate-600 ring-1 ring-slate-200 ring-inset">
        This quiz is <strong>anonymous</strong>. No email or name is asked for, and your
        professor sees your answers under a number, not your name.
      </div>

      <Button
        variant="primary"
        pending={join.pending}
        className="w-full py-3 text-base"
        onClick={() => void submit()}
      >
        Join as guest
      </Button>
    </div>
  )
}

function IdentifiedJoin({ joinToken, info, onJoined }: RegistrationFormProps) {
  const [values, setValues] = useState<Record<'email' | FieldKey, string>>({
    email: '',
    name: '',
    surname: '',
    personalNumber: '',
    faculty: '',
  })
  const [touched, setTouched] = useState(false)

  const visible = (Object.keys(FIELD_LABELS) as FieldKey[]).filter(
    (key) => info.fields[key] !== 'HIDDEN',
  )

  const missing = (key: FieldKey | 'email', requirement: FieldRequirement) =>
    requirement === 'REQUIRED' && values[key].trim().length === 0

  const emailInvalid = values.email.trim().length === 0 || !values.email.includes('@')
  const incomplete =
    emailInvalid || visible.some((key) => missing(key, info.fields[key]))

  const join = useAction(() => {
    const body: JoinRequest = { ...EMPTY_JOIN, email: values.email.trim() }
    for (const key of visible) {
      body[key] = values[key].trim() || null
    }
    return joinApi.join(joinToken, body)
  })

  const submit = async () => {
    setTouched(true)
    if (incomplete) {
      return
    }
    const result = await join.run()
    if (result.ok) {
      onJoined(result.value)
    }
  }

  const set = (key: 'email' | FieldKey, value: string) =>
    setValues((current) => ({ ...current, [key]: value }))

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault()
        void submit()
      }}
    >
      {join.error && <ErrorBanner error={join.error} />}

      <TextField
        label="Email"
        type="email"
        inputMode="email"
        autoComplete="email"
        autoCapitalize="none"
        value={values.email}
        maxLength={255}
        error={touched && emailInvalid ? 'Enter a valid email address' : join.error?.fieldError('email')}
        onChange={(event) => set('email', event.target.value)}
      />

      {visible.map((key) => (
        <TextField
          key={key}
          label={
            info.fields[key] === 'REQUIRED' ? FIELD_LABELS[key] : `${FIELD_LABELS[key]} (optional)`
          }
          value={values[key]}
          maxLength={key === 'personalNumber' ? 64 : 255}
          error={
            touched && missing(key, info.fields[key])
              ? `${FIELD_LABELS[key]} is required`
              : join.error?.fieldError(key)
          }
          onChange={(event) => set(key, event.target.value)}
        />
      ))}

      <Button
        type="submit"
        variant="primary"
        pending={join.pending}
        className="w-full py-3 text-base"
      >
        Join quiz
      </Button>
    </form>
  )
}
