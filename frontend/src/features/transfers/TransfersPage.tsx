import { useQuery } from '@tanstack/react-query'
import { ArrowLeftRight, Eye, Plus } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Badge,
  Button,
  DataTable,
  PageHeader,
  Pagination,
  SearchInput,
  SectionCard,
  Select,
  statusTone,
  type Column,
} from '../../components/ui'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { canOperateInventory, useAuth } from '../../hooks/useAuth'
import { transferApi, warehouseApi } from '../../lib/api'
import { errorMessage } from '../../lib/errors'
import { shortDate, titleCase } from '../../lib/format'
import type { StockTransfer } from '../../types'

export function TransfersPage() {
  const { user } = useAuth()
  const canOperate = canOperateInventory(user)
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [warehouseId, setWarehouseId] = useState('')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(25)
  const debouncedSearch = useDebouncedValue(search)

  const transfers = useQuery({
    queryKey: ['transfers', { debouncedSearch, status, warehouseId, page, perPage }],
    queryFn: () => transferApi.list({ search: debouncedSearch || undefined, status: status || undefined, warehouse_id: warehouseId || undefined, page, per_page: perPage }),
  })
  const warehouses = useQuery({ queryKey: ['warehouses', 'options'], queryFn: () => warehouseApi.list({ per_page: 100 }) })

  const columns: Column<StockTransfer>[] = [
    {
      key: 'number',
      header: 'Transfer',
      cell: (transfer) => (
        <div className="min-w-0">
          <Link to={`/transfers/${transfer.id}`} className="block truncate font-mono text-xs font-semibold text-emerald-700 hover:underline dark:text-emerald-300">{transfer.transfer_number}</Link>
          <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">{transfer.items.length} line{transfer.items.length === 1 ? '' : 's'} · {transfer.total_quantity ?? 0} units</p>
        </div>
      ),
    },
    {
      key: 'route',
      header: 'Route',
      cell: (transfer) => (
        <span className="inline-flex items-center gap-1.5 text-xs">
          {transfer.source_warehouse?.name ?? `#${transfer.source_warehouse_id}`}
          <ArrowLeftRight className="h-3 w-3 text-slate-400" />
          {transfer.destination_warehouse?.name ?? `#${transfer.destination_warehouse_id}`}
        </span>
      ),
      className: 'hidden md:table-cell',
    },
    { key: 'status', header: 'Status', cell: (transfer) => <Badge tone={statusTone(transfer.status)}>{titleCase(transfer.status)}</Badge> },
    { key: 'shipped', header: 'Shipped', cell: (transfer) => <span className="whitespace-nowrap text-xs">{shortDate(transfer.shipped_at)}</span>, className: 'hidden lg:table-cell' },
    { key: 'received', header: 'Received', cell: (transfer) => <span className="whitespace-nowrap text-xs">{shortDate(transfer.received_at)}</span>, className: 'hidden lg:table-cell' },
    {
      key: 'actions',
      header: '',
      align: 'right',
      cell: (transfer) => <button type="button" aria-label="View transfer" onClick={() => navigate(`/transfers/${transfer.id}`)} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"><Eye className="h-3.5 w-3.5" /></button>,
    },
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Operations"
        title="Transfers"
        description="Move stock between warehouses with a source and destination audit trail."
        actions={canOperate ? <Link to="/transfers/new"><Button icon={<Plus className="h-4 w-4" />}>New transfer</Button></Link> : undefined}
      />

      <SectionCard>
        <div className="grid gap-2 border-b border-slate-100 p-3 dark:border-slate-800 sm:grid-cols-[minmax(0,1fr)_170px_180px]">
          <SearchInput value={search} onChange={(value) => { setSearch(value); setPage(1) }} placeholder="Search transfer number" label="Search transfers" />
          <Select aria-label="Filter by status" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1) }}>
            <option value="">All statuses</option>
            {['DRAFT', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED'].map((value) => <option key={value} value={value}>{titleCase(value)}</option>)}
          </Select>
          <Select aria-label="Filter by warehouse" value={warehouseId} onChange={(event) => { setWarehouseId(event.target.value); setPage(1) }}>
            <option value="">All warehouses</option>
            {(warehouses.data?.data ?? []).map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}
          </Select>
        </div>

        <DataTable
          columns={columns}
          rows={transfers.data?.data ?? []}
          rowKey={(transfer) => transfer.id}
          loading={transfers.isLoading}
          error={transfers.isError ? errorMessage(transfers.error) : null}
          onRetry={() => void transfers.refetch()}
          emptyTitle="No transfers"
          emptyDescription="Create a transfer to move stock between warehouses."
          emptyAction={canOperate ? <Link to="/transfers/new"><Button size="sm" icon={<Plus className="h-3.5 w-3.5" />}>New transfer</Button></Link> : undefined}
          onRowClick={(transfer) => navigate(`/transfers/${transfer.id}`)}
          footer={transfers.data ? <Pagination meta={transfers.data.meta} onPageChange={setPage} onPerPageChange={(value) => { setPerPage(value); setPage(1) }} /> : undefined}
        />
      </SectionCard>
    </div>
  )
}
