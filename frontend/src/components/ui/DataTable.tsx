import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '../../utils/cn'
import { EmptyState, ErrorState, TableSkeleton } from './States'

export type Column<T> = {
  key: string
  header: string
  cell: (row: T) => ReactNode
  className?: string
  headerClassName?: string
  sortable?: string
  align?: 'left' | 'right' | 'center'
}

type DataTableProps<T> = {
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T) => string | number
  loading?: boolean
  error?: string | null
  onRetry?: () => void
  emptyTitle?: string
  emptyDescription?: string
  emptyAction?: ReactNode
  sortBy?: string
  sortDirection?: 'asc' | 'desc'
  onSort?: (key: string) => void
  onRowClick?: (row: T) => void
  footer?: ReactNode
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading,
  error,
  onRetry,
  emptyTitle = 'Nothing here yet',
  emptyDescription,
  emptyAction,
  sortBy,
  sortDirection,
  onSort,
  onRowClick,
  footer,
}: DataTableProps<T>) {
  if (loading) return <TableSkeleton columns={columns.length} />
  if (error) return <ErrorState message={error} onRetry={onRetry} />
  if (rows.length === 0) return <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800">
              {columns.map((column) => {
                const active = sortBy === column.sortable
                return (
                  <th
                    key={column.key}
                    scope="col"
                    className={cn(
                      'whitespace-nowrap px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400',
                      column.align === 'right' && 'text-right',
                      column.align === 'center' && 'text-center',
                      column.headerClassName,
                    )}
                  >
                    {column.sortable && onSort ? (
                      <button type="button" onClick={() => onSort(column.sortable!)} className="inline-flex items-center gap-1 rounded transition hover:text-slate-900 dark:hover:text-white">
                        {column.header}
                        {active ? (sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-40" />}
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {rows.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn('transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/40', onRowClick && 'cursor-pointer')}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn(
                      'px-4 py-3 align-middle text-slate-700 dark:text-slate-200',
                      column.align === 'right' && 'text-right',
                      column.align === 'center' && 'text-center',
                      column.className,
                    )}
                  >
                    {column.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {footer}
    </div>
  )
}
