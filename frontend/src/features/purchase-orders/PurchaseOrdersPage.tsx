import { useQuery } from '@tanstack/react-query'
import { Eye, Plus } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Badge,
  Button,
  DataTable,
  Field,
  Input,
  PageHeader,
  Pagination,
  SearchInput,
  SectionCard,
  Select,
  statusTone,
  type Column,
} from '../../components/ui'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { canManageCatalog, useAuth } from '../../hooks/useAuth'
import { purchaseOrderApi, supplierApi, warehouseApi } from '../../lib/api'
import { errorMessage } from '../../lib/errors'
import { money, shortDate, titleCase } from '../../lib/format'
import type { PurchaseOrder } from '../../types'

const statuses = ['DRAFT', 'ORDERED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED']

export function PurchaseOrdersPage() {
  const { user } = useAuth()
  const canManage = canManageCatalog(user)
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [supplierId, setSupplierId] = useState('')
  const [warehouseId, setWarehouseId] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(15)
  const debouncedSearch = useDebouncedValue(search)

  const orders = useQuery({
    queryKey: ['purchase-orders', { debouncedSearch, status, supplierId, warehouseId, from, to, page, perPage }],
    queryFn: () => purchaseOrderApi.list({
      search: debouncedSearch || undefined,
      status: status || undefined,
      supplier_id: supplierId || undefined,
      warehouse_id: warehouseId || undefined,
      from: from || undefined,
      to: to || undefined,
      page,
      per_page: perPage,
    }),
  })
  const suppliers = useQuery({ queryKey: ['suppliers', 'options'], queryFn: () => supplierApi.list({ per_page: 100 }) })
  const warehouses = useQuery({ queryKey: ['warehouses', 'options'], queryFn: () => warehouseApi.list({ per_page: 100 }) })

  const columns: Column<PurchaseOrder>[] = [
    {
      key: 'number',
      header: 'Order',
      cell: (order) => (
        <div className="min-w-0">
          <Link to={`/purchase-orders/${order.id}`} className="block truncate font-mono text-xs font-semibold text-emerald-700 hover:underline dark:text-emerald-300">{order.order_number}</Link>
          <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">{order.items.length} line{order.items.length === 1 ? '' : 's'}</p>
        </div>
      ),
    },
    { key: 'supplier', header: 'Supplier', cell: (order) => <span className="text-xs">{order.supplier?.name ?? '—'}</span> },
    { key: 'warehouse', header: 'Warehouse', cell: (order) => <span className="text-xs">{order.warehouse?.name ?? '—'}</span>, className: 'hidden md:table-cell' },
    { key: 'status', header: 'Status', cell: (order) => <Badge tone={statusTone(order.status)}>{titleCase(order.status)}</Badge> },
    { key: 'expected', header: 'Expected', cell: (order) => <span className="whitespace-nowrap text-xs">{shortDate(order.expected_at)}</span>, className: 'hidden lg:table-cell' },
    { key: 'total', header: 'Total', align: 'right', cell: (order) => <span className="font-semibold">{money(order.total)}</span> },
    {
      key: 'actions',
      header: '',
      align: 'right',
      cell: (order) => <button type="button" aria-label={`View ${order.order_number}`} onClick={() => navigate(`/purchase-orders/${order.id}`)} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"><Eye className="h-3.5 w-3.5" /></button>,
    },
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Purchasing"
        title="Purchase orders"
        description="Order from suppliers and receive goods partially or in full."
        actions={canManage ? <Link to="/purchase-orders/new"><Button icon={<Plus className="h-4 w-4" />}>New order</Button></Link> : undefined}
      />

      <SectionCard>
        <div className="grid gap-2 border-b border-slate-100 p-3 dark:border-slate-800 sm:grid-cols-2 xl:grid-cols-6">
          <SearchInput value={search} onChange={(value) => { setSearch(value); setPage(1) }} placeholder="Search order number" label="Search purchase orders" />
          <Select aria-label="Filter by status" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1) }}>
            <option value="">All statuses</option>
            {statuses.map((value) => <option key={value} value={value}>{titleCase(value)}</option>)}
          </Select>
          <Select aria-label="Filter by supplier" value={supplierId} onChange={(event) => { setSupplierId(event.target.value); setPage(1) }}>
            <option value="">All suppliers</option>
            {(suppliers.data?.data ?? []).map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
          </Select>
          <Select aria-label="Filter by warehouse" value={warehouseId} onChange={(event) => { setWarehouseId(event.target.value); setPage(1) }}>
            <option value="">All warehouses</option>
            {(warehouses.data?.data ?? []).map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}
          </Select>
          <Field label="From" htmlFor="po-from">
            <Input id="po-from" type="date" value={from} max={to || undefined} onChange={(event) => { setFrom(event.target.value); setPage(1) }} />
          </Field>
          <Field label="To" htmlFor="po-to">
            <Input id="po-to" type="date" value={to} min={from || undefined} onChange={(event) => { setTo(event.target.value); setPage(1) }} />
          </Field>
        </div>

        <DataTable
          columns={columns}
          rows={orders.data?.data ?? []}
          rowKey={(order) => order.id}
          loading={orders.isLoading}
          error={orders.isError ? errorMessage(orders.error) : null}
          onRetry={() => void orders.refetch()}
          emptyTitle="No purchase orders"
          emptyDescription="Create a purchase order to replenish low stock."
          emptyAction={canManage ? <Link to="/purchase-orders/new"><Button size="sm" icon={<Plus className="h-3.5 w-3.5" />}>New order</Button></Link> : undefined}
          onRowClick={(order) => navigate(`/purchase-orders/${order.id}`)}
          footer={orders.data ? <Pagination meta={orders.data.meta} onPageChange={setPage} onPerPageChange={(value) => { setPerPage(value); setPage(1) }} /> : undefined}
        />
      </SectionCard>
    </div>
  )
}

