import type { ReactNode } from 'react'
import { cn } from '../../utils/cn'

type Tone = 'emerald' | 'amber' | 'rose' | 'slate' | 'sky' | 'violet'

const tones: Record<Tone, string> = {
  emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-400/20',
  amber: 'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-950/50 dark:text-amber-300 dark:ring-amber-400/20',
  rose: 'bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-950/50 dark:text-rose-300 dark:ring-rose-400/20',
  slate: 'bg-slate-100 text-slate-600 ring-slate-500/20 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-400/20',
  sky: 'bg-sky-50 text-sky-700 ring-sky-600/20 dark:bg-sky-950/50 dark:text-sky-300 dark:ring-sky-400/20',
  violet: 'bg-violet-50 text-violet-700 ring-violet-600/20 dark:bg-violet-950/50 dark:text-violet-300 dark:ring-violet-400/20',
}

export function Badge({ children, tone = 'slate', className }: { children: ReactNode; tone?: Tone; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset', tones[tone], className)}>
      {children}
    </span>
  )
}

export function statusTone(status: string): Tone {
  switch (status) {
    case 'RECEIVED':
    case 'COMPLETED':
    case 'SUBMITTED':
    case 'ok':
      return 'emerald'
    case 'ORDERED':
    case 'IN_TRANSIT':
    case 'PARTIALLY_RECEIVED':
      return 'sky'
    case 'DRAFT':
      return 'slate'
    case 'CANCELLED':
    case 'out':
      return 'rose'
    case 'low':
      return 'amber'
    default:
      return 'slate'
  }
}
