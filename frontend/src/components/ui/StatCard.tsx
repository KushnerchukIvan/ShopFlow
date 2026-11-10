import type { ReactNode } from 'react'
import { cn } from '../../utils/cn'

type StatCardProps = {
  title: string
  value: ReactNode
  icon: ReactNode
  hint?: string
  tone?: 'emerald' | 'sky' | 'amber' | 'violet' | 'rose'
  loading?: boolean
}

const tones = {
  emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300',
  sky: 'bg-sky-50 text-sky-600 dark:bg-sky-950/50 dark:text-sky-300',
  amber: 'bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-300',
  violet: 'bg-violet-50 text-violet-600 dark:bg-violet-950/50 dark:text-violet-300',
  rose: 'bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-300',
}

export function StatCard({ title, value, icon, hint, tone = 'emerald', loading }: StatCardProps) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">{title}</p>
          <p className={cn('mt-2 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white', loading && 'animate-pulse text-slate-300 dark:text-slate-700')}>
            {loading ? '0000' : value}
          </p>
          {hint && <p className="mt-1 truncate text-[11px] text-slate-400 dark:text-slate-500">{hint}</p>}
        </div>
        <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-lg', tones[tone])}>{icon}</span>
      </div>
    </article>
  )
}
