import { useQuery } from '@tanstack/react-query'
import { Download, TrendingUp } from 'lucide-react'
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
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
  StatCard,
  Tabs,
  statusTone,
  type Column,
} from '../../components/ui'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { categoryApi, reportApi, supplierApi, warehouseApi } from '../../lib/api'
import { errorMessage } from '../../lib/errors'
import { money, number, shortDate, titleCase } from '../../lib/format'
import type { CategoryReportRow, InventoryItem, PurchaseOrder, ValuationRow, WarehouseReportRow } from '../../types'

const tabs = [
  { id: 'valuation', label: 'Inventory valuation' },
  { id: 'top', label: 'Top products' },
  { id: 'warehouse', label: 'By warehouse' },
  { id: 'category', label: 'By category' },
  { id: 'low-stock', label: 'Low stock' },
  { id: 'movements', label: 'Movements' },
  { id: 'purchases', label: 'Purchase history' },
]

const colors = ['#059669', '#0ea5e9', '#f59e0b', '#8b5cf6', '#f43f5e', '#14b8a6', '#64748b', '#84cc16']

export function ReportsPage() {
  const [searchParams] = useSearchParams()
  const initialTab = searchParams.get('tab')
  const [tab, setTab] = useState(initialTab && tabs.some((item) => item.id === initialTab) ? initialTab : 'valuation')

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Analytics" title="Reports" description="Backend-aggregated inventory reporting with CSV exports." />
      <SectionCard>
        <Tabs tabs={tabs} active={tab} onChange={setTab} className="px-2" />
        <div className="p-4">
          {tab === 'valuation' && <ValuationTab />}
          {tab === 'top' && <TopProductsTab />}
          {tab === 'warehouse' && <WarehouseTab />}
          {tab === 'category' && <CategoryTab />}
          {tab === 'low-stock' && <LowStockTab />}
          {tab === 'movements' && <MovementsTab />}
          {tab === 'purchases' && <PurchasesTab />}
        </div>
      </SectionCard>
    </div>
  )
}

function useOptions() {
  const warehouses = useQuery({ queryKey: ['warehouses', 'options'], queryFn: () => warehouseApi.list({ per_page: 100 }) })
  const categories = useQuery({ queryKey: ['categories', 'options'], queryFn: () => categoryApi.list({ per_page: 100 }) })
  const suppliers = useQuery({ queryKey: ['suppliers', 'options'], queryFn: () => supplierApi.list({ per_page: 100 }) })

  return { warehouses, categories, suppliers }
}

function ValuationTab() {
  const { warehouses, categories } = useOptions()
  const [search, setSearch] = useState('')
  const [warehouseId, setWarehouseId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [page, setPage] = useState(1)
  const [sortBy, setSortBy] = useState('name')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const debouncedSearch = useDebouncedValue(search)

  const query = useQuery({
    queryKey: ['reports', 'valuation', { debouncedSearch, warehouseId, categoryId, page, sortBy, sortDirection }],
    queryFn: () => reportApi.valuation({ search: debouncedSearch || undefined, warehouse_id: warehouseId || undefined, category_id: categoryId || undefined, page, per_page: 25, sort_by: sortBy, sort_direction: sortDirection }),
  })

  const columns: Column<ValuationRow>[] = [
    { key: 'product', header: 'Product', cell: (row) => <div><p className="font-semibold text-slate-900 dark:text-white">{row.product}</p><p className="font-mono text-[11px] text-slate-500 dark:text-slate-400">{row.sku}</p></div> },
    { key: 'category', header: 'Category', cell: (row) => row.category ?? '—' },
    { key: 'supplier', header: 'Supplier', cell: (row) => row.supplier ?? '—', className: 'hidden lg:table-cell' },
    { key: 'quantity', header: 'Quantity', align: 'right', cell: (row) => number(row.quantity) },
    { key: 'cost', header: 'Unit cost', align: 'right', cell: (row) => money(row.purchase_price) },
    { key: 'value', header: 'Value', align: 'right', cell: (row) => <span className="font-semibold">{money(row.value)}</span> },
  ]

  const exportUrl = reportApi.exportUrl('inventory-valuation', { search: debouncedSearch || undefined, warehouse_id: warehouseId || undefined, category_id: categoryId || undefined })

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="grid flex-1 gap-2 sm:grid-cols-3">
          <SearchInput value={search} onChange={(value) => { setSearch(value); setPage(1) }} placeholder="Search product or SKU" label="Search valuation" />
          <Select aria-label="Filter valuation by warehouse" value={warehouseId} onChange={(event) => { setWarehouseId(event.target.value); setPage(1) }}>
            <option value="">All warehouses</option>
            {(warehouses.data?.data ?? []).map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}
          </Select>
          <Select aria-label="Filter valuation by category" value={categoryId} onChange={(event) => { setCategoryId(event.target.value); setPage(1) }}>
            <option value="">All categories</option>
            {(categories.data?.data ?? []).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </Select>
        </div>
        <a href={exportUrl}><Button variant="secondary" icon={<Download className="h-4 w-4" />}>Export CSV</Button></a>
      </div>
      <DataTable
        columns={columns}
        rows={query.data?.data ?? []}
        rowKey={(row) => row.product_id}
        loading={query.isLoading}
        error={query.isError ? errorMessage(query.error) : null}
        onRetry={() => void query.refetch()}
        sortBy={sortBy}
        sortDirection={sortDirection}
        onSort={(key) => {
          if (sortBy === key) setSortDirection((direction) => (direction === 'asc' ? 'desc' : 'asc'))
          else { setSortBy(key); setSortDirection('asc') }
          setPage(1)
        }}
        emptyTitle="No valuation rows"
        footer={query.data ? <Pagination meta={query.data.meta} onPageChange={setPage} /> : undefined}
      />
    </div>
  )
}

function TopProductsTab() {
  const query = useQuery({
    queryKey: ['reports', 'top-products'],
    queryFn: () => reportApi.valuation({ sort_by: 'value', sort_direction: 'desc', per_page: 10 }),
  })
  const rows = query.data?.data ?? []
  const max = Number(rows[0]?.value ?? 1)

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500 dark:text-slate-400">The ten products holding the highest inventory cost value.</p>
      {query.isError && <p className="text-sm text-rose-600">{errorMessage(query.error)}</p>}
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {query.isLoading && Array.from({ length: 5 }).map((_, index) => <div key={index} className="h-12 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />)}
        {rows.map((row, index) => (
          <div key={row.product_id} className="py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900 dark:text-white"><span className="mr-2 text-slate-400">{index + 1}.</span>{row.product}</p>
                <p className="font-mono text-[11px] text-slate-500 dark:text-slate-400">{row.sku} · {number(row.quantity)} units</p>
              </div>
              <span className="shrink-0 text-sm font-semibold text-slate-900 dark:text-white">{money(row.value)}</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.max(3, Math.round((Number(row.value) / max) * 100))}%` }} />
            </div>
          </div>
        ))}
        {!query.isLoading && rows.length === 0 && <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">No inventory value to rank yet.</p>}
      </div>
    </div>
  )
}

function WarehouseTab() {
  const query = useQuery({ queryKey: ['reports', 'by-warehouse'], queryFn: reportApi.byWarehouse })

  const columns: Column<WarehouseReportRow>[] = [
    { key: 'warehouse', header: 'Warehouse', cell: (row) => <div><p className="font-semibold text-slate-900 dark:text-white">{row.warehouse}</p><p className="font-mono text-[11px] text-slate-500 dark:text-slate-400">{row.code}</p></div> },
    { key: 'products', header: 'Products', align: 'right', cell: (row) => number(row.product_count) },
    { key: 'records', header: 'Stock records', align: 'right', cell: (row) => number(row.stock_record_count) },
    { key: 'quantity', header: 'Units', align: 'right', cell: (row) => number(row.quantity) },
    { key: 'low', header: 'Low stock', align: 'right', cell: (row) => <Badge tone={row.low_stock_records > 0 ? 'amber' : 'emerald'}>{row.low_stock_records}</Badge> },
    { key: 'value', header: 'Value', align: 'right', cell: (row) => <span className="font-semibold">{money(row.value)}</span> },
  ]

  return (
    <div className="space-y-4">
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={(query.data ?? []).map((row) => ({ ...row, value: Number(row.value) }))} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis dataKey="warehouse" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(value: number) => `$${Math.round(value / 1000)}k`} axisLine={false} tickLine={false} width={48} />
            <Tooltip formatter={(value) => money(Number(value))} contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 12 }} />
            <Bar dataKey="value" fill="#059669" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <DataTable columns={columns} rows={query.data ?? []} rowKey={(row) => row.warehouse_id} loading={query.isLoading} error={query.isError ? errorMessage(query.error) : null} onRetry={() => void query.refetch()} emptyTitle="No warehouse data" />
    </div>
  )
}

function CategoryTab() {
  const query = useQuery({ queryKey: ['reports', 'by-category'], queryFn: reportApi.byCategory })

  const columns: Column<CategoryReportRow>[] = [
    { key: 'category', header: 'Category', cell: (row) => <span className="font-semibold text-slate-900 dark:text-white">{row.category}</span> },
    { key: 'products', header: 'Products', align: 'right', cell: (row) => number(row.product_count) },
    { key: 'quantity', header: 'Units', align: 'right', cell: (row) => number(row.quantity) },
    { key: 'value', header: 'Value', align: 'right', cell: (row) => <span className="font-semibold">{money(row.value)}</span> },
  ]

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={(query.data ?? []).map((row) => ({ ...row, value: Number(row.value) }))} dataKey="value" nameKey="category" innerRadius={52} outerRadius={88} paddingAngle={2} strokeWidth={0}>
              {(query.data ?? []).map((row, index) => <Cell key={row.category_id} fill={colors[index % colors.length]} />)}
            </Pie>
            <Tooltip formatter={(value) => money(Number(value))} contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <DataTable columns={columns} rows={query.data ?? []} rowKey={(row) => row.category_id} loading={query.isLoading} error={query.isError ? errorMessage(query.error) : null} onRetry={() => void query.refetch()} emptyTitle="No category data" />
    </div>
  )
}

function LowStockTab() {
  const { warehouses, categories } = useOptions()
  const [warehouseId, setWarehouseId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [page, setPage] = useState(1)

  const query = useQuery({
    queryKey: ['reports', 'low-stock', { warehouseId, categoryId, page }],
    queryFn: () => reportApi.lowStock({ warehouse_id: warehouseId || undefined, category_id: categoryId || undefined, page, per_page: 25 }),
  })

  const columns: Column<InventoryItem>[] = [
    { key: 'product', header: 'Product', cell: (row) => <div><p className="font-semibold text-slate-900 dark:text-white">{row.product?.name}</p><p className="font-mono text-[11px] text-slate-500 dark:text-slate-400">{row.product?.sku}</p></div> },
    { key: 'warehouse', header: 'Warehouse', cell: (row) => row.warehouse?.name ?? '—' },
    { key: 'quantity', header: 'On hand', align: 'right', cell: (row) => <span className="font-semibold text-amber-600 dark:text-amber-400">{number(row.quantity)}</span> },
    { key: 'minimum', header: 'Minimum', align: 'right', cell: (row) => number(row.minimum_stock) },
    { key: 'shortfall', header: 'Shortfall', align: 'right', cell: (row) => number(Math.max(0, row.minimum_stock - row.quantity)) },
    { key: 'value', header: 'Stock value', align: 'right', cell: (row) => money(row.stock_value) },
  ]

  const exportUrl = reportApi.exportUrl('low-stock', { warehouse_id: warehouseId || undefined, category_id: categoryId || undefined })

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="grid flex-1 gap-2 sm:grid-cols-2">
          <Select aria-label="Filter low stock by warehouse" value={warehouseId} onChange={(event) => { setWarehouseId(event.target.value); setPage(1) }}>
            <option value="">All warehouses</option>
            {(warehouses.data?.data ?? []).map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}
          </Select>
          <Select aria-label="Filter low stock by category" value={categoryId} onChange={(event) => { setCategoryId(event.target.value); setPage(1) }}>
            <option value="">All categories</option>
            {(categories.data?.data ?? []).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </Select>
        </div>
        <a href={exportUrl}><Button variant="secondary" icon={<Download className="h-4 w-4" />}>Export CSV</Button></a>
      </div>
      <DataTable
        columns={columns}
        rows={query.data?.data ?? []}
        rowKey={(row) => row.id}
        loading={query.isLoading}
        error={query.isError ? errorMessage(query.error) : null}
        onRetry={() => void query.refetch()}
        emptyTitle="No low-stock products"
        emptyDescription="Every visible product is above its minimum level."
        footer={query.data ? <Pagination meta={query.data.meta} onPageChange={setPage} /> : undefined}
      />
    </div>
  )
}

function MovementsTab() {
  const { warehouses } = useOptions()
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [type, setType] = useState('')
  const [warehouseId, setWarehouseId] = useState('')

  const query = useQuery({
    queryKey: ['reports', 'movements', { from, to, type, warehouseId }],
    queryFn: () => reportApi.stockMovements({ from: from || undefined, to: to || undefined, type: type || undefined, warehouse_id: warehouseId || undefined }),
  })

  const exportUrl = reportApi.exportUrl('movements', { from: from || undefined, to: to || undefined, type: type || undefined, warehouse_id: warehouseId || undefined })
  const report = query.data

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="grid flex-1 gap-2 sm:grid-cols-4">
          <Field label="From" htmlFor="report-from"><Input id="report-from" type="date" value={from} max={to || undefined} onChange={(event) => setFrom(event.target.value)} /></Field>
          <Field label="To" htmlFor="report-to"><Input id="report-to" type="date" value={to} min={from || undefined} onChange={(event) => setTo(event.target.value)} /></Field>
          <Field label="Type" htmlFor="report-type">
            <Select id="report-type" value={type} onChange={(event) => setType(event.target.value)}>
              <option value="">All types</option>
              {['IN', 'OUT', 'TRANSFER_IN', 'TRANSFER_OUT', 'ADJUSTMENT_IN', 'ADJUSTMENT_OUT'].map((value) => <option key={value} value={value}>{titleCase(value)}</option>)}
            </Select>
          </Field>
          <Field label="Warehouse" htmlFor="report-warehouse">
            <Select id="report-warehouse" value={warehouseId} onChange={(event) => setWarehouseId(event.target.value)}>
              <option value="">All warehouses</option>
              {(warehouses.data?.data ?? []).map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}
            </Select>
          </Field>
        </div>
        <a href={exportUrl}><Button variant="secondary" icon={<Download className="h-4 w-4" />}>Export CSV</Button></a>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard title="Movements" value={number(report?.movement_count ?? 0)} icon={<TrendingUp className="h-4 w-4" />} loading={query.isLoading} />
        <StatCard title="Units moved" value={number(report?.quantity_total ?? 0)} icon={<TrendingUp className="h-4 w-4" />} tone="sky" loading={query.isLoading} />
        <StatCard title="Movement types" value={report?.by_type.length ?? 0} icon={<TrendingUp className="h-4 w-4" />} tone="violet" loading={query.isLoading} />
        <StatCard title="Period" value={from || to ? `${from || '…'} → ${to || '…'}` : 'All time'} icon={<TrendingUp className="h-4 w-4" />} tone="amber" loading={query.isLoading} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(report?.by_type ?? []).map((row) => (
          <div key={row.type} className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
            <div className="flex items-center justify-between gap-2">
              <Badge tone={row.type.includes('IN') ? 'emerald' : 'amber'}>{titleCase(row.type)}</Badge>
              <span className="text-sm font-semibold">{number(row.quantity_total)} units</span>
            </div>
            <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">{number(row.movement_count)} movements</p>
          </div>
        ))}
        {!report?.by_type.length && <p className="text-sm text-slate-500 dark:text-slate-400">No movements in this period.</p>}
      </div>
      {query.isError && <p className="text-sm text-rose-600">{errorMessage(query.error)}</p>}
    </div>
  )
}

function PurchasesTab() {
  const { warehouses, suppliers } = useOptions()
  const [status, setStatus] = useState('')
  const [supplierId, setSupplierId] = useState('')
  const [warehouseId, setWarehouseId] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(1)

  const query = useQuery({
    queryKey: ['reports', 'purchases', { status, supplierId, warehouseId, from, to, page }],
    queryFn: () => reportApi.purchaseHistory({ status: status || undefined, supplier_id: supplierId || undefined, warehouse_id: warehouseId || undefined, from: from || undefined, to: to || undefined, page, per_page: 25 }),
  })

  const columns: Column<PurchaseOrder>[] = [
    { key: 'number', header: 'Order', cell: (row) => <span className="font-mono text-xs font-semibold">{row.order_number}</span> },
    { key: 'supplier', header: 'Supplier', cell: (row) => row.supplier?.name ?? '—' },
    { key: 'warehouse', header: 'Warehouse', cell: (row) => row.warehouse?.name ?? '—', className: 'hidden md:table-cell' },
    { key: 'status', header: 'Status', cell: (row) => <Badge tone={statusTone(row.status)}>{titleCase(row.status)}</Badge> },
    { key: 'expected', header: 'Expected', cell: (row) => shortDate(row.expected_at), className: 'hidden lg:table-cell' },
    { key: 'total', header: 'Total', align: 'right', cell: (row) => <span className="font-semibold">{money(row.total)}</span> },
  ]

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-6">
        <Select aria-label="Filter purchases by status" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1) }}>
          <option value="">All statuses</option>
          {['DRAFT', 'ORDERED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED'].map((value) => <option key={value} value={value}>{titleCase(value)}</option>)}
        </Select>
        <Select aria-label="Filter purchases by supplier" value={supplierId} onChange={(event) => { setSupplierId(event.target.value); setPage(1) }}>
          <option value="">All suppliers</option>
          {(suppliers.data?.data ?? []).map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
        </Select>
        <Select aria-label="Filter purchases by warehouse" value={warehouseId} onChange={(event) => { setWarehouseId(event.target.value); setPage(1) }}>
          <option value="">All warehouses</option>
          {(warehouses.data?.data ?? []).map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}
        </Select>
        <Input aria-label="Purchases from date" type="date" value={from} max={to || undefined} onChange={(event) => { setFrom(event.target.value); setPage(1) }} />
        <Input aria-label="Purchases to date" type="date" value={to} min={from || undefined} onChange={(event) => { setTo(event.target.value); setPage(1) }} />
      </div>
      <DataTable
        columns={columns}
        rows={query.data?.data ?? []}
        rowKey={(row) => row.id}
        loading={query.isLoading}
        error={query.isError ? errorMessage(query.error) : null}
        onRetry={() => void query.refetch()}
        emptyTitle="No purchase history"
        footer={query.data ? <Pagination meta={query.data.meta} onPageChange={setPage} /> : undefined}
      />
    </div>
  )
}
