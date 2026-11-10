import { forwardRef, useId } from 'react'
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { cn } from '../../utils/cn'

const controlClass =
  'w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:disabled:bg-slate-800'

type FieldProps = {
  label: string
  htmlFor?: string
  hint?: string
  error?: string
  required?: boolean
  className?: string
  children: ReactNode
}

export function Field({ label, htmlFor, hint, error, required, className, children }: FieldProps) {
  return (
    <div className={cn('grid min-w-0 gap-1.5', className)}>
      <label htmlFor={htmlFor} className="text-xs font-semibold text-slate-600 dark:text-slate-300">
        {label}
        {required && <span className="ml-0.5 text-rose-500">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-[11px] text-slate-500 dark:text-slate-400">{hint}</p>}
      {error && <p className="text-[11px] font-medium text-rose-600 dark:text-rose-400">{error}</p>}
    </div>
  )
}

type InputProps = InputHTMLAttributes<HTMLInputElement> & { error?: boolean }

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ className, error, ...props }, ref) {
  return <input ref={ref} className={cn(controlClass, 'h-10', error && 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20', className)} {...props} />
})

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & { error?: boolean }

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select({ className, error, children, ...props }, ref) {
  return (
    <select ref={ref} className={cn(controlClass, 'h-10 pr-8', error && 'border-rose-400', className)} {...props}>
      {children}
    </select>
  )
})

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: boolean }

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea({ className, error, ...props }, ref) {
  return <textarea ref={ref} className={cn(controlClass, 'min-h-24 py-2', error && 'border-rose-400', className)} {...props} />
})

type CheckboxProps = InputHTMLAttributes<HTMLInputElement> & { label: string }

export function Checkbox({ label, className, id, ...props }: CheckboxProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId

  return (
    <label htmlFor={inputId} className={cn('flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200', className)}>
      <input id={inputId} type="checkbox" className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" {...props} />
      {label}
    </label>
  )
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">
      {message}
    </p>
  )
}

export function FormActions({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">{children}</div>
}
