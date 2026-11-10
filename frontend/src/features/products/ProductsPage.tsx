import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Archive, Eye, Pencil, Plus } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  Badge,
  Button,
  ConfirmDialog,
  DataTable,
  PageHeader,
  Pagination,
  SearchInput,
  SectionCard,
  Select,
  type Column,
} from '../../components/ui'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { canManageCatalog, useAuth } from '../../hooks/useAuth'
import { categoryApi, productApi, supplierApi } from '../../lib/api'
import { errorMessage } from '../../lib/errors'
import { money, number } from '../../lib/format'
import type { Product } from '../../types'

export function ProductsPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [supplierId, setSupplierId] = useState('')
  const [active, setActive] = useState('')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(15)
  const [sortBy, setSortBy] = useState('name')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [archiveTarget, setArchiveTarget] = useState<Product | null>(null)
  const debouncedSearch = useDebouncedValue(search)

  const products = useQuery({
    queryKey: ['products', { debouncedSearch, categoryId, supplierId, active, page, perPage, sortBy, sortDirection }],
    queryFn: () => productApi.list({
      search: debouncedSearch || undefined,
      category_id: categoryId || undefined,
      supplier_id: supplierId || undefined,
      is_active: active === '' ? undefined : active === 'active',
      page,
      per_page: perPage,
      sort_by: sortBy,
      sort_direction: sortDirection,
    }),
  })

  const categories = useQuery({ queryKey: ['categories', 'options'], queryFn: () => categoryApi.list({ per_page: 100 }) })
  const suppliers = useQuery({ queryKey: ['suppliers', 'options'], queryFn: () => supplierApi.list({ per_page: 100 }) })
  const canManage = canManageCatalog(user)

  const archive = useMutation({
    mutationFn: (id: number) => productApi.archive(id),
    onSuccess: () => {
      toast.success('Product archived')
      setArchiveTarget(null)
      void queryClient.invalidateQueries({ queryKey: ['products'] })
    },
    onError: (error) => toast.error(errorMessage(error)),
  })

  const updateSort = (key: string) => {
    if (sortBy === key) setSortDirection((direction) => (direction === 'asc' ? 'desc' : 'asc'))
    else {
      setSortBy(key)
      setSortDirection('asc')
    }
    setPage(1)
  }

  const columns: Column<Product>[] = [
    {
      key: 'product',
      header: 'Product',
      sortable: 'name',
      cell: (product) => (
        <div className="min-w-0">
          <Link to={`/products/${product.id}`} className="block truncate font-semibold text-slate-900 hover:text-emerald-700 dark:text-white dark:hover:text-emerald-300">{product.name}</Link>
          <p className="mt-0.5 truncate text-[11px] text-slate-500 dark:text-slate-400">{product.barcode ?? 'No barcode'}</p>
        </div>
      ),
    },
    { key: 'sku', header: 'SKU', sortable: 'sku', cell: (product) => <span className="font-mono text-xs">{product.sku}</span> },
    { key: 'category', header: 'Category', cell: (product) => product.category?.name ?? '—' },
    { key: 'supplier', header: 'Supplier', cell: (product) => product.supplier?.name ?? '—', className: 'hidden lg:table-cell' },
    { key: 'purchase', header: 'Cost', sortable: 'purchase_price', align: 'right', cell: (product) => money(product.purchase_price) },
    { key: 'selling', header: 'Price', sortable: 'selling_price', align: 'right', cell: (product) => money(product.selling_price) },
    { key: 'stock', header: 'Stock', align: 'right', cell: (product) => <span className="font-semibold">{number(product.total_quantity ?? 0)}</span> },
    {
      key: 'status',
      header: 'Status',
      cell: (product) => <Badge tone={product.is_active ? 'emerald' : 'slate'}>{product.is_active ? 'Active' : 'Inactive'}</Badge>,
    },
    ...(canManage
      ? [{
          key: 'actions',
          header: '',
          align: 'right' as const,
          cell: (product: Product) => (
            <div className="flex items-center justify-end gap-1">
              <button type="button" aria-label={`View ${product.name}`} onClick={() => navigate(`/products/${product.id}`)} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"><Eye className="h-3.5 w-3.5" /></button>
              <button type="button" aria-label={`Edit ${product.name}`} onClick={() => navigate(`/products/${product.id}/edit`)} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"><Pencil className="h-3.5 w-3.5" /></button>
              <button type="button" aria-label={`Archive ${product.name}`} onClick={() => setArchiveTarget(product)} className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"><Archive className="h-3.5 w-3.5" /></button>
            </div>
          ),
        }]
      : []),
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Catalog"
        title="Products"
        description="Search, filter, and maintain every product in your catalog."
        actions={canManage ? <Link to="/products/new"><Button icon={<Plus className="h-4 w-4" />}>Add product</Button></Link> : undefined}
      />

      <SectionCard>
        <div className="grid gap-2 border-b border-slate-100 p-3 dark:border-slate-800 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_180px_180px_140px]">
          <SearchInput value={search} onChange={(value) => { setSearch(value); setPage(1) }} placeholder="Search name, SKU, or barcode" label="Search products" />
          <Select aria-label="Filter by category" value={categoryId} onChange={(event) => { setCategoryId(event.target.value); setPage(1) }}>
            <option value="">All categories</option>
            {(categories.data?.data ?? []).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </Select>
          <Select aria-label="Filter by supplier" value={supplierId} onChange={(event) => { setSupplierId(event.target.value); setPage(1) }}>
            <option value="">All suppliers</option>
            {(suppliers.data?.data ?? []).map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
          </Select>
          <Select aria-label="Filter by status" value={active} onChange={(event) => { setActive(event.target.value); setPage(1) }}>
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
        </div>

        <DataTable
          columns={columns}
          rows={products.data?.data ?? []}
          rowKey={(product) => product.id}
          loading={products.isLoading}
          error={products.isError ? errorMessage(products.error) : null}
          onRetry={() => void products.refetch()}
          sortBy={sortBy}
          sortDirection={sortDirection}
          onSort={updateSort}
          emptyTitle="No products found"
          emptyDescription={search || categoryId || supplierId || active ? 'Try clearing the filters or searching for a different term.' : 'Create your first product to start tracking inventory.'}
          emptyAction={canManage ? <Link to="/products/new"><Button size="sm" icon={<Plus className="h-3.5 w-3.5" />}>Add product</Button></Link> : undefined}
          footer={products.data ? <Pagination meta={products.data.meta} onPageChange={setPage} onPerPageChange={(value) => { setPerPage(value); setPage(1) }} /> : undefined}
        />
      </SectionCard>

      <ConfirmDialog
        open={Boolean(archiveTarget)}
        title="Archive product"
        description={<>Archive <strong>{archiveTarget?.name}</strong>? Archived products are hidden from the catalog but their ledger history is preserved. Products with stock on hand or open documents cannot be archived.</>}
        confirmLabel="Archive product"
        destructive
        loading={archive.isPending}
        onCancel={() => setArchiveTarget(null)}
        onConfirm={() => archiveTarget && archive.mutate(archiveTarget.id)}
      />
    </div>
  )
}
