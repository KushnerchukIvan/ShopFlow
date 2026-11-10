import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { PaginationMeta } from '../../types'

type PaginationProps = {
  meta: PaginationMeta
  onPageChange: (page: number) => void
  onPerPageChange?: (perPage: number) => void
}

export function Pagination({ meta, onPageChange, onPerPageChange }: PaginationProps) {
  const pages = pageWindow(meta.current_page, meta.last_page)
  const from = meta.total === 0 ? 0 : (meta.current_page - 1) * meta.per_page + 1
  const to = Math.min(meta.current_page * meta.per_page, meta.total)

  return (
    <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Showing <span className="font-semibold text-slate-700 dark:text-slate-200">{from}–{to}</span> of{' '}
        <span className="font-semibold text-slate-700 dark:text-slate-200">{meta.total}</span>
      </p>
      <div className="flex flex-wrap items-center gap-3">
        {onPerPageChange && (
          <label className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            Rows
            <select
              value={meta.per_page}
              onChange={(event) => onPerPageChange(Number(event.target.value))}
              className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              {[10, 15, 25, 50, 100].map((size) => <option key={size} value={size}>{size}</option>)}
            </select>
          </label>
        )}
        <div className="flex items-center gap-1">
          <button type="button" aria-label="Previous page" disabled={meta.current_page <= 1} onClick={() => onPageChange(meta.current_page - 1)} className="grid h-8 w-8 place-items-center rounded-md border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:hover:bg-slate-800">
            <ChevronLeft className="h-4 w-4" />
          </button>
          {pages.map((page, index) =>
            page === 'ellipsis' ? (
              <span key={`gap-${index}`} className="px-1 text-xs text-slate-400">…</span>
            ) : (
              <button
                key={page}
                type="button"
                onClick={() => onPageChange(page)}
                aria-current={page === meta.current_page ? 'page' : undefined}
                className={page === meta.current_page
                  ? 'grid h-8 min-w-8 place-items-center rounded-md bg-emerald-600 px-2 text-xs font-semibold text-white'
                  : 'grid h-8 min-w-8 place-items-center rounded-md border border-slate-200 px-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'}
              >
                {page}
              </button>
            ),
          )}
          <button type="button" aria-label="Next page" disabled={meta.current_page >= meta.last_page} onClick={() => onPageChange(meta.current_page + 1)} className="grid h-8 w-8 place-items-center rounded-md border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:hover:bg-slate-800">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

function pageWindow(current: number, last: number): Array<number | 'ellipsis'> {
  if (last <= 7) return Array.from({ length: last }, (_, index) => index + 1)
  const pages: Array<number | 'ellipsis'> = [1]
  const start = Math.max(2, current - 1)
  const end = Math.min(last - 1, current + 1)
  if (start > 2) pages.push('ellipsis')
  for (let page = start; page <= end; page += 1) pages.push(page)
  if (end < last - 1) pages.push('ellipsis')
  pages.push(last)
  return pages
}
