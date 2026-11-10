import { useQuery } from '@tanstack/react-query'
import { Download, Eye, History } from 'lucide-react'
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Badge, DataTable, Field, Input, Modal, PageHeader, Pagination, SearchInput, SectionCard, Select, statusTone, type Column } from '../../components/ui'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { movementApi, productApi, warehouseApi } from '../../lib/api'
import { errorMessage } from '../../lib/errors'
import { dateTime, number, titleCase } from '../../lib/format'
import type { MovementType, StockMovement } from '../../types'

const movementTypes: MovementType[] = ['IN', 'OUT', 'TRANSFER_IN', 'TRANSFER_OUT', 'ADJUSTMENT_IN', 'ADJUSTMENT_OUT']

export function StockMovementsPage() {
  const [searchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [type, setType] = useState('')
  const [warehouseId, setWarehouseId] = useState(searchParams.get('warehouse_id') ?? '')
  const [productId, setProductId] = useState(searchParams.get('product_id') ?? '')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(25)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [selected, setSelected] = useState<StockMovement | null>(null)
  const debouncedSearch = useDebouncedValue(search)

  const params = {
    search: debouncedSearch || undefined,
    type: type || undefined,
    warehouse_id: warehouseId || undefined,
    product_id: productId || undefined,
    from: from || undefined,
    to: to || undefined,
    page,
    per_page: perPage,
    sort_by: 'created_at',
    sort_direction: sortDirection,
  }

  const movements = useQuery({
    queryKey: ['stock-movements', params],
    queryFn: () => movementApi.list(params),
  })
  const warehouses = useQuery({ queryKey: ['warehouses', 'options'], queryFn: () => warehouseApi.list({ per_page: 100 }) })
  const products = useQuery({ queryKey: ['products', 'options'], queryFn: () => productApi.list({ per_page: 100, sort_by: 'name' }) })

  const columns: Column<StockMovement>[] = [
    { key: 'date', header: 'Date', sortable: 'created_at', cell: (row) => <span className="whitespace-nowrap text-xs">{dateTime(row.created_at)}</span> },
    {
      key: 'product',
      header: 'Product',
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate font-semibold text-slate-900 dark:text-white">{row.product?.name ?? `Product #${row.product_id}`}</p>
          <p className="font-mono text-[11px] text-slate-500 dark:text-slate-400">{row.product?.sku}</p>
        </div>
      ),
    },
    { key: 'warehouse', header: 'Warehouse', cell: (row) => row.warehouse?.name ?? '—', className: 'hidden md:table-cell' },
    { key: 'type', header: 'Type', cell: (row) => <Badge tone={statusTone(row.type.includes('IN') ? 'ok' : 'low')}>{titleCase(row.type)}</Badge> },
    { key: 'quantity', header: 'Qty', sortable: 'quantity', align: 'right', cell: (row) => <span className="font-semibold">{number(row.quantity)}</span> },
    { key: 'reference', header: 'Reference', cell: (row) => row.reference_type ? `${row.reference_type.split('\\').pop()} #${row.reference_id}` : '—', className: 'hidden lg:table-cell' },
    { key: 'reason', header: 'Reason', cell: (row) => <span className="block max-w-44 truncate text-xs text-slate-600 dark:text-slate-300">{row.reason ?? '—'}</span>, className: 'hidden xl:table-cell' },
    { key: 'user', header: 'User', cell: (row) => row.user?.name ?? '—', className: 'hidden xl:table-cell' },
    {
      key: 'actions',
      header: '',
      align: 'right',
      cell: (row) => <button type="button" aria-label="View movement" onClick={() => setSelected(row)} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"><Eye className="h-3.5 w-3.5" /></button>,
    },
  ]

  const exportUrl = movementApi.exportUrl({ ...params, page: undefined, per_page: undefined })

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Audit trail"
        title="Stock movements"
        description="Every inventory change, in an immutable ledger."
        actions={<a href={exportUrl} className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"><Download className="h-4 w-4" /> Export CSV</a>}
      />

      <SectionCard>
        <div className="grid gap-2 border-b border-slate-100 p-3 dark:border-slate-800 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_160px_170px_180px_140px_140px]">
          <SearchInput value={search} onChange={(value) => { setSearch(value); setPage(1) }} placeholder="Search product, SKU, or reason" label="Search movements" />
          <Select aria-label="Filter by type" value={type} onChange={(event) => { setType(event.target.value); setPage(1) }}>
            <option value="">All types</option>
            {movementTypes.map((movementType) => <option key={movementType} value={movementType}>{titleCase(movementType)}</option>)}
          </Select>
          <Select aria-label="Filter by warehouse" value={warehouseId} onChange={(event) => { setWarehouseId(event.target.value); setPage(1) }}>
            <option value="">All warehouses</option>
            {(warehouses.data?.data ?? []).map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}
          </Select>
          <Select aria-label="Filter by product" value={productId} onChange={(event) => { setProductId(event.target.value); setPage(1) }}>
            <option value="">All products</option>
            {(products.data?.data ?? []).map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
          </Select>
          <Field label="From" htmlFor="movement-from" className="text-[10px]">
            <Input id="movement-from" type="date" value={from} max={to || undefined} onChange={(event) => { setFrom(event.target.value); setPage(1) }} />
          </Field>
          <Field label="To" htmlFor="movement-to" className="text-[10px]">
            <Input id="movement-to" type="date" value={to} min={from || undefined} onChange={(event) => { setTo(event.target.value); setPage(1) }} />
          </Field>
        </div>

        <DataTable
          columns={columns}
          rows={movements.data?.data ?? []}
          rowKey={(row) => row.id}
          loading={movements.isLoading}
          error={movements.isError ? errorMessage(movements.error) : null}
          onRetry={() => void movements.refetch()}
          sortBy="created_at"
          sortDirection={sortDirection}
          onSort={() => setSortDirection((direction) => (direction === 'asc' ? 'desc' : 'asc'))}
          emptyTitle="No stock movements"
          emptyDescription="Stock changes will appear here as soon as they are recorded."
          footer={movements.data ? <Pagination meta={movements.data.meta} onPageChange={setPage} onPerPageChange={(value) => { setPerPage(value); setPage(1) }} /> : undefined}
        />
      </SectionCard>

      <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
        <History className="h-3.5 w-3.5" /> Movement history is read-only and cannot be edited or deleted.
      </div>

      <Modal open={Boolean(selected)} onClose={() => setSelected(null)} title="Movement details" description={selected ? dateTime(selected.created_at) : undefined}>
        {selected && (
          <dl className="grid gap-3 sm:grid-cols-2">
            <Detail label="Product" value={selected.product?.name ?? `#${selected.product_id}`} />
            <Detail label="SKU" value={selected.product?.sku ?? '—'} />
            <Detail label="Warehouse" value={selected.warehouse?.name ?? '—'} />
            <Detail label="Type" value={<Badge tone={statusTone(selected.type.includes('IN') ? 'ok' : 'low')}>{titleCase(selected.type)}</Badge>} />
            <Detail label="Quantity" value={number(selected.quantity)} />
            <Detail label="Recorded by" value={selected.user?.name ?? '—'} />
            <Detail label="Reference" value={selected.reference_type ? `${selected.reference_type.split('\\').pop()} #${selected.reference_id}` : '—'} />
            <Detail label="Reason" value={selected.reason ?? '—'} />
            <div className="sm:col-span-2"><Detail label="Notes" value={selected.notes ?? '—'} /></div>
          </dl>
        )}
      </Modal>
    </div>
  )
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-slate-800 dark:text-slate-100">{value}</dd>
    </div>
  )
}
