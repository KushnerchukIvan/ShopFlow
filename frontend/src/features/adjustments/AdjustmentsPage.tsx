import { useQuery } from '@tanstack/react-query'
import { ClipboardCheck, Eye, Plus } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Badge, Button, DataTable, PageHeader, Pagination, SearchInput, SectionCard, Select, statusTone, type Column } from '../../components/ui'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { canOperateInventory, useAuth } from '../../hooks/useAuth'
import { adjustmentApi, warehouseApi } from '../../lib/api'
import { errorMessage } from '../../lib/errors'
import { shortDate, titleCase } from '../../lib/format'
import type { StockAdjustment } from '../../types'

export function AdjustmentsPage() {
  const { user } = useAuth()
  const canOperate = canOperateInventory(user)
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [warehouseId, setWarehouseId] = useState('')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(25)
  const debouncedSearch = useDebouncedValue(search)

  const adjustments = useQuery({
    queryKey: ['adjustments', { debouncedSearch, status, warehouseId, page, perPage }],
    queryFn: () => adjustmentApi.list({ search: debouncedSearch || undefined, status: status || undefined, warehouse_id: warehouseId || undefined, page, per_page: perPage }),
  })
  const warehouses = useQuery({ queryKey: ['warehouses', 'options'], queryFn: () => warehouseApi.list({ per_page: 100 }) })

  const columns: Column<StockAdjustment>[] = [
    {
      key: 'number',
      header: 'Adjustment',
      cell: (adjustment) => (
        <div className="min-w-0">
          <Link to={`/adjustments/${adjustment.id}`} className="block truncate font-mono text-xs font-semibold text-emerald-700 hover:underline dark:text-emerald-300">{adjustment.adjustment_number}</Link>
          <p className="mt-0.5 truncate text-[11px] text-slate-500 dark:text-slate-400">{adjustment.reason}</p>
        </div>
      ),
    },
    { key: 'warehouse', header: 'Warehouse', cell: (adjustment) => adjustment.warehouse?.name ?? '—' },
    { key: 'status', header: 'Status', cell: (adjustment) => <Badge tone={statusTone(adjustment.status)}>{titleCase(adjustment.status)}</Badge> },
    { key: 'items', header: 'Items', align: 'right', cell: (adjustment) => adjustment.items.length },
    {
      key: 'difference',
      header: 'Net difference',
      align: 'right',
      cell: (adjustment) => {
        const difference = adjustment.items.reduce((sum, line) => sum + line.difference, 0)
        return <span className={difference === 0 ? 'text-slate-500' : difference > 0 ? 'font-semibold text-emerald-600 dark:text-emerald-400' : 'font-semibold text-rose-600 dark:text-rose-400'}>{difference > 0 ? '+' : ''}{difference}</span>
      },
    },
    { key: 'created', header: 'Created', cell: (adjustment) => <span className="whitespace-nowrap text-xs">{shortDate(adjustment.created_at)}</span>, className: 'hidden lg:table-cell' },
    {
      key: 'actions',
      header: '',
      align: 'right',
      cell: (adjustment) => <button type="button" aria-label="View adjustment" onClick={() => navigate(`/adjustments/${adjustment.id}`)} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"><Eye className="h-3.5 w-3.5" /></button>,
    },
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Operations"
        title="Stock adjustments"
        description="Reconcile system balances with a physical count. Differences create ledger movements."
        actions={canOperate ? <Link to="/adjustments/new"><Button icon={<Plus className="h-4 w-4" />}>New count</Button></Link> : undefined}
      />

      <SectionCard>
        <div className="grid gap-2 border-b border-slate-100 p-3 dark:border-slate-800 sm:grid-cols-[minmax(0,1fr)_160px_180px]">
          <SearchInput value={search} onChange={(value) => { setSearch(value); setPage(1) }} placeholder="Search adjustment number or reason" label="Search adjustments" />
          <Select aria-label="Filter by status" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1) }}>
            <option value="">All statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="SUBMITTED">Submitted</option>
          </Select>
          <Select aria-label="Filter by warehouse" value={warehouseId} onChange={(event) => { setWarehouseId(event.target.value); setPage(1) }}>
            <option value="">All warehouses</option>
            {(warehouses.data?.data ?? []).map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}
          </Select>
        </div>

        <DataTable
          columns={columns}
          rows={adjustments.data?.data ?? []}
          rowKey={(adjustment) => adjustment.id}
          loading={adjustments.isLoading}
          error={adjustments.isError ? errorMessage(adjustments.error) : null}
          onRetry={() => void adjustments.refetch()}
          emptyTitle="No stock counts"
          emptyDescription="Create a physical count to reconcile inventory."
          emptyAction={canOperate ? <Link to="/adjustments/new"><Button size="sm" icon={<ClipboardCheck className="h-3.5 w-3.5" />}>New count</Button></Link> : undefined}
          onRowClick={(adjustment) => navigate(`/adjustments/${adjustment.id}`)}
          footer={adjustments.data ? <Pagination meta={adjustments.data.meta} onPageChange={setPage} onPerPageChange={(value) => { setPerPage(value); setPage(1) }} /> : undefined}
        />
      </SectionCard>
    </div>
  )
}
