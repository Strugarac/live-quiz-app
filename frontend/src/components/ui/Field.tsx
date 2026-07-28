import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'

const CONTROL =
  'block w-full rounded-lg bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-300 ring-inset placeholder:text-slate-400 focus:ring-2 focus:ring-brand-600 disabled:bg-slate-100 disabled:text-slate-500'

const CONTROL_INVALID = 'ring-red-400 focus:ring-red-500'

interface LabelledProps {
  label: string
  hint?: ReactNode
  error?: string
  children: (props: { id: string; describedBy: string | undefined; invalid: boolean }) => ReactNode
}

/** Shared label / hint / error scaffolding so every control is wired for a11y. */
function Labelled({ label, hint, error, children }: LabelledProps) {
  const id = useId()
  const hintId = `${id}-hint`
  const describedBy = error || hint ? hintId : undefined

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </label>
      {children({ id, describedBy, invalid: Boolean(error) })}
      {(error || hint) && (
        <p id={hintId} className={`mt-1.5 text-xs ${error ? 'text-red-600' : 'text-slate-500'}`}>
          {error ?? hint}
        </p>
      )}
    </div>
  )
}

type TextFieldProps = { label: string; hint?: ReactNode; error?: string } & Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'id' | 'className'
>

export function TextField({ label, hint, error, ...rest }: TextFieldProps) {
  return (
    <Labelled label={label} hint={hint} error={error}>
      {({ id, describedBy, invalid }) => (
        <input
          id={id}
          type="text"
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          className={`${CONTROL} ${invalid ? CONTROL_INVALID : ''}`}
          {...rest}
        />
      )}
    </Labelled>
  )
}

type TextAreaProps = { label: string; hint?: ReactNode; error?: string } & Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  'id' | 'className'
>

export function TextArea({ label, hint, error, rows = 3, ...rest }: TextAreaProps) {
  return (
    <Labelled label={label} hint={hint} error={error}>
      {({ id, describedBy, invalid }) => (
        <textarea
          id={id}
          rows={rows}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          className={`${CONTROL} ${invalid ? CONTROL_INVALID : ''}`}
          {...rest}
        />
      )}
    </Labelled>
  )
}

type SelectFieldProps = {
  label: string
  hint?: ReactNode
  error?: string
  options: Array<{ value: string; label: string }>
} & Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id' | 'className' | 'children'>

export function SelectField({ label, hint, error, options, ...rest }: SelectFieldProps) {
  return (
    <Labelled label={label} hint={hint} error={error}>
      {({ id, describedBy, invalid }) => (
        <select
          id={id}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          className={`${CONTROL} ${invalid ? CONTROL_INVALID : ''}`}
          {...rest}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )}
    </Labelled>
  )
}

interface CheckboxProps {
  label: string
  description?: string
  checked: boolean
  disabled?: boolean
  onChange: (checked: boolean) => void
}

export function Checkbox({ label, description, checked, disabled, onChange }: CheckboxProps) {
  const id = useId()
  return (
    <div className="flex gap-3">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 size-4 shrink-0 rounded border-slate-300 text-brand-600 accent-brand-600 disabled:opacity-50"
      />
      <div className="text-sm">
        <label htmlFor={id} className="font-medium text-slate-700">
          {label}
        </label>
        {description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}
      </div>
    </div>
  )
}
