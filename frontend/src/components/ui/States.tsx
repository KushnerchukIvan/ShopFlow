import { AlertTriangle, Inbox, RefreshCw } from 'lucide-react'
import type { ReactNode } from 'react'

export function EmptyState({ title, description, action, icon }: { title: string; description?: string; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      <div className="grid h-11 w-11 place-items-center rounded-xl bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
        {icon ?? <Inbox className="h-5 w-5" />}
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</p>
        {description && <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-slate-500 dark:text-slate-400">{description}</p>}
      </div>
      {action}
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
      <div className="grid h-11 w-11 place-items-center rounded-xl bg-rose-50 text-rose-500 dark:bg-rose-950/50 dark:text-rose-300">
        <AlertTriangle className="h-5 w-5" />
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Could not load this data</p>
        <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-slate-500 dark:text-slate-400">{message}</p>
      </div>
      {onRetry && (
        <button type="button" onClick={onRetry} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
          <RefreshCw className="h-3.5 w-3.5" /> Try again
        </button>
      )}
    </div>
  )
}

export function TableSkeleton({ columns = 5, rows = 6 }: { columns?: number; rows?: number }) {
  return (
    <div className="animate-pulse px-4 py-3" aria-label="Loading table">
      <div className="mb-3 h-3 w-1/3 rounded bg-slate-200 dark:bg-slate-800" />
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-3 border-t border-slate-100 py-3 dark:border-slate-800">
          {Array.from({ length: columns }).map((__, columnIndex) => (
            <div key={columnIndex} className="h-3 flex-1 rounded bg-slate-100 dark:bg-slate-800" />
          ))}
        </div>
      ))}
    </div>
  )
}

export function LoadingScreen({ label = 'Loading ShopFlow…' }: { label?: string }) {
  return (
    <div className="grid min-h-screen place-items-center bg-slate-50 dark:bg-slate-950">
      <div className="flex items-center gap-3 text-sm font-medium text-slate-500 dark:text-slate-400">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
        {label}
      </div>
    </div>
  )
}

export function PageSkeleton() {
  return (
    <div className="space-y-4" aria-label="Loading page">
      <div className="h-8 w-56 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
      <div className="h-4 w-80 max-w-full animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-28 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />)}
      </div>
      <div className="h-72 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
    </div>
  )
}
