import { cn } from '../../utils/cn'

type Tab = { id: string; label: string; count?: number }

export function Tabs({ tabs, active, onChange, className }: { tabs: Tab[]; active: string; onChange: (id: string) => void; className?: string }) {
  return (
    <div className={cn('flex gap-1 overflow-x-auto border-b border-slate-200 dark:border-slate-800', className)} role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={active === tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            'flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-xs font-semibold transition-colors',
            active === tab.id
              ? 'border-emerald-600 text-emerald-700 dark:border-emerald-400 dark:text-emerald-300'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200',
          )}
        >
          {tab.label}
          {tab.count !== undefined && <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500 dark:bg-slate-800 dark:text-slate-400">{tab.count}</span>}
        </button>
      ))}
    </div>
  )
}
