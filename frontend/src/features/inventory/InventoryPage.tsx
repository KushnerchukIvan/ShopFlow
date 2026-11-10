import { useQuery } from '@tanstack/react-query'
import { ArrowDownToLine, ArrowLeftRight, ArrowUpFromLine, ClipboardCheck, SlidersHorizontal } from 'lucide-react'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
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
import { categoryApi, inventoryApi, warehouseApi } from '../../lib/api'
import { errorMessage } from '../../lib/errors'
import { money, number } from '../../lib/format'
import type { InventoryItem } from '../../types'
import { StockFormModal, type StockOperation } from './StockFormModal'

export function InventoryPage() {
  const { user } = useAuth()
  const canOperate = canOperateInventory(user)
  const [searchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [warehouseId, setWarehouseId] = useState(searchParams.get('warehouse_id') ?? '')
  const [categoryId, setCategoryId] = useState('')
  const [stockStatus, setStockStatus] = useState(searchParams.get('low_stock') === 'true' ? 'low' : '')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(25)
  const [sortBy, setSortBy] = useState('id')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [modal, setModal] = useState<{ operation: StockOperation; productId?: number; warehouseId?: number } | null>(() => {
    const action = searchParams.get('action')
    if (action === 'stock-in' || action === 'stock-out') {
      return { operation: action, productId: searchParams.get('product_id') ? Number(searchParams.get('product_id')) : undefined, warehouseId: searchParams.get('warehouse_id') ? Number(searchParams.get('warehouse_id')) : undefined }
    }
    return null
  })
  const debouncedSearch = useDebouncedValue(search)

  const inventory = useQuery({
    queryKey: ['inventory', { debouncedSearch, warehouseId, categoryId, stockStatus, page, perPage, sortBy, sortDirection }],
    queryFn: () => inventoryApi.list({
      search: debouncedSearch || undefined,
      warehouse_id: warehouseId || undefined,
      category_id: categoryId || undefined,
      stock_status: stockStatus || undefined,
      page,
      per_page: perPage,
      sort_by: sortBy,
      sort_direction: sortDirection,
    }),
  })
  const warehouses = useQuery({ queryKey: ['warehouses', 'options'], queryFn: () => warehouseApi.list({ per_page: 100 }) })
  const categories = useQuery({ queryKey: ['categories', 'options'], queryFn: () => categoryApi.list({ per_page: 100 }) })

  const updateSort = (key: string) => {
    if (sortBy === key) setSortDirection((direction) => (direction === 'asc' ? 'desc' : 'asc'))
    else {
      setSortBy(key)
      setSortDirection('asc')
    }
    setPage(1)
  }

  const columns: Column<InventoryItem>[] = [
    {
      key: 'product',
      header: 'Product',
      sortable: 'product_name',
      cell: (row) => (
        <Link to={`/products/${row.product_id}`} className="block min-w-0 hover:text-emerald-700 dark:hover:text-emerald-300">
          <span className="block truncate font-semibold text-slate-900 dark:text-white">{row.product?.name ?? `Product #${row.product_id}`}</span>
          <span className="block font-mono text-[11px] text-slate-500 dark:text-slate-400">{row.product?.sku}</span>
        </Link>
      ),
    },
    { key: 'warehouse', header: 'Warehouse', cell: (row) => <span className="block text-xs">{row.warehouse?.name ?? '—'}</span> },
    { key: 'quantity', header: 'Available', sortable: 'quantity', align: 'right', cell: (row) => <span className="font-semibold">{number(row.quantity)}</span> },
    { key: 'minimum', header: 'Minimum', sortable: 'minimum_stock', align: 'right', cell: (row) => number(row.minimum_stock) },
    { key: 'value', header: 'Stock value', sortable: 'stock_value', align: 'right', cell: (row) => money(row.stock_value) },
    {
      key: 'status',
      header: 'Status',
      cell: (row) => <Badge tone={statusTone(row.stock_status)}>{row.stock_status === 'out' ? 'Out of stock' : row.stock_status === 'low' ? 'Low stock' : 'Healthy'}</Badge>,
    },
    ...(canOperate
      ? [{
          key: 'actions',
          header: '',
          align: 'right' as const,
          cell: (row: InventoryItem) => (
            <div className="flex items-center justify-end gap-0.5">
              <button type="button" title="Stock in" aria-label={`Stock in ${row.product?.name}`} onClick={() => setModal({ operation: 'stock-in', productId: row.product_id, warehouseId: row.warehouse_id })} className="rounded-md p-1.5 text-slate-400 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/40"><ArrowDownToLine className="h-3.5 w-3.5" /></button>
              <button type="button" title="Stock out" aria-label={`Stock out ${row.product?.name}`} onClick={() => setModal({ operation: 'stock-out', productId: row.product_id, warehouseId: row.warehouse_id })} className="rounded-md p-1.5 text-slate-400 hover:bg-amber-50 hover:text-amber-700 dark:hover:bg-amber-950/40"><ArrowUpFromLine className="h-3.5 w-3.5" /></button>
              <Link title="Transfer stock" to={`/transfers/new?productId=${row.product_id}&warehouseId=${row.warehouse_id}`} className="rounded-md p-1.5 text-slate-400 hover:bg-sky-50 hover:text-sky-700 dark:hover:bg-sky-950/40"><ArrowLeftRight className="h-3.5 w-3.5" /></Link>
              <Link title="Adjust stock" to={`/adjustments/new?productId=${row.product_id}&warehouseId=${row.warehouse_id}`} className="rounded-md p-1.5 text-slate-400 hover:bg-violet-50 hover:text-violet-700 dark:hover:bg-violet-950/40"><ClipboardCheck className="h-3.5 w-3.5" /></Link>
            </div>
          ),
        }]
      : []),
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Operations"
        title="Inventory"
        description="Current quantities across your warehouses, backed by the movement ledger."
        actions={
          canOperate ? (
            <>
              <Button variant="secondary" icon={<ArrowDownToLine className="h-4 w-4" />} onClick={() => setModal({ operation: 'stock-in' })}>Stock in</Button>
              <Button variant="danger" icon={<ArrowUpFromLine className="h-4 w-4" />} onClick={() => setModal({ operation: 'stock-out' })}>Stock out</Button>
            </>
          ) : undefined
        }
      />

      <SectionCard>
        <div className="grid gap-2 border-b border-slate-100 p-3 dark:border-slate-800 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_180px_180px_170px]">
          <SearchInput value={search} onChange={(value) => { setSearch(value); setPage(1) }} placeholder="Search product or SKU" label="Search inventory" />
          <Select aria-label="Filter by warehouse" value={warehouseId} onChange={(event) => { setWarehouseId(event.target.value); setPage(1) }}>
            <option value="">All warehouses</option>
            {(warehouses.data?.data ?? []).map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}
          </Select>
          <Select aria-label="Filter by category" value={categoryId} onChange={(event) => { setCategoryId(event.target.value); setPage(1) }}>
            <option value="">All categories</option>
            {(categories.data?.data ?? []).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </Select>
          <Select aria-label="Filter by stock status" value={stockStatus} onChange={(event) => { setStockStatus(event.target.value); setPage(1) }}>
            <option value="">All stock levels</option>
            <option value="ok">Healthy</option>
            <option value="low">Low stock</option>
            <option value="out">Out of stock</option>
          </Select>
        </div>

        <DataTable
          columns={columns}
          rows={inventory.data?.data ?? []}
          rowKey={(row) => row.id}
          loading={inventory.isLoading}
          error={inventory.isError ? errorMessage(inventory.error) : null}
          onRetry={() => void inventory.refetch()}
          sortBy={sortBy}
          sortDirection={sortDirection}
          onSort={updateSort}
          emptyTitle="No inventory records"
          emptyDescription="Receive stock or place a purchase order to start building balances."
          footer={inventory.data ? <Pagination meta={inventory.data.meta} onPageChange={setPage} onPerPageChange={(value) => { setPerPage(value); setPage(1) }} /> : undefined}
        />
      </SectionCard>

      <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
        <SlidersHorizontal className="h-3.5 w-3.5" />
        Low stock is calculated per warehouse when quantity is at or below the product minimum.
      </div>

      {modal && <StockFormModal open operation={modal.operation} productId={modal.productId} warehouseId={modal.warehouseId} onClose={() => setModal(null)} />}
    </div>
  )
}
