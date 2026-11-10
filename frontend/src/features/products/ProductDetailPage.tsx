import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Archive, ArrowLeft, Boxes, ImagePlus, Pencil, Trash2, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  Badge,
  Button,
  ConfirmDialog,
  DataTable,
  ErrorState,
  PageHeader,
  PageSkeleton,
  SectionCard,
  StatCard,
  statusTone,
  type Column,
} from '../../components/ui'
import { canManageCatalog, useAuth } from '../../hooks/useAuth'
import { inventoryApi, movementApi, productApi } from '../../lib/api'
import { errorMessage } from '../../lib/errors'
import { dateTime, money, number, titleCase } from '../../lib/format'
import type { InventoryItem, StockMovement } from '../../types'

export function ProductDetailPage() {
  const params = useParams()
  const productId = Number(params.id)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const canManage = canManageCatalog(user)
  const [archiveOpen, setArchiveOpen] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  const product = useQuery({ queryKey: ['products', 'detail', productId], queryFn: () => productApi.get(productId), enabled: Number.isFinite(productId) })
  const inventory = useQuery({ queryKey: ['inventory', 'product', productId], queryFn: () => inventoryApi.forProduct(productId), enabled: Number.isFinite(productId) })
  const movements = useQuery({
    queryKey: ['stock-movements', 'product', productId],
    queryFn: () => movementApi.list({ product_id: productId, per_page: 10 }),
    enabled: Number.isFinite(productId),
  })

  const archive = useMutation({
    mutationFn: () => productApi.archive(productId),
    onSuccess: () => {
      toast.success('Product archived')
      navigate('/products')
    },
    onError: (error) => toast.error(errorMessage(error)),
  })

  const upload = useMutation({
    mutationFn: (file: File) => productApi.uploadImage(productId, file),
    onSuccess: () => {
      toast.success('Product image updated')
      void queryClient.invalidateQueries({ queryKey: ['products', 'detail', productId] })
    },
    onError: (error) => toast.error(errorMessage(error)),
  })

  const removeImage = useMutation({
    mutationFn: () => productApi.deleteImage(productId),
    onSuccess: () => {
      toast.success('Product image removed')
      void queryClient.invalidateQueries({ queryKey: ['products', 'detail', productId] })
    },
    onError: (error) => toast.error(errorMessage(error)),
  })

  if (product.isLoading) return <PageSkeleton />
  if (product.isError || !product.data) return <ErrorState message={errorMessage(product.error)} onRetry={() => void product.refetch()} />

  const item = product.data
  const total = item.stock_by_warehouse?.reduce((sum, balance) => sum + balance.quantity, 0) ?? item.total_quantity ?? 0
  const stockValue = total * Number(item.purchase_price)

  const stockColumns: Column<InventoryItem>[] = [
    { key: 'warehouse', header: 'Warehouse', cell: (row) => <span className="font-medium">{row.warehouse?.name ?? '—'}</span> },
    { key: 'code', header: 'Code', cell: (row) => <span className="font-mono text-xs">{row.warehouse?.code ?? '—'}</span> },
    { key: 'quantity', header: 'Quantity', align: 'right', cell: (row) => <span className="font-semibold">{number(row.quantity)}</span> },
    { key: 'minimum', header: 'Minimum', align: 'right', cell: (row) => number(row.minimum_stock) },
    {
      key: 'status',
      header: 'Status',
      align: 'right',
      cell: (row) => <Badge tone={statusTone(row.stock_status)}>{row.stock_status === 'out' ? 'Out of stock' : row.stock_status === 'low' ? 'Low stock' : 'Healthy'}</Badge>,
    },
  ]

  const movementColumns: Column<StockMovement>[] = [
    { key: 'date', header: 'Date', cell: (row) => dateTime(row.created_at) },
    { key: 'type', header: 'Type', cell: (row) => <Badge tone={row.type.includes('IN') ? 'emerald' : 'amber'}>{titleCase(row.type)}</Badge> },
    { key: 'warehouse', header: 'Warehouse', cell: (row) => row.warehouse?.name ?? '—' },
    { key: 'quantity', header: 'Quantity', align: 'right', cell: (row) => row.quantity },
    { key: 'user', header: 'User', cell: (row) => row.user?.name ?? '—' },
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Product"
        title={item.name}
        description={`${item.sku}${item.barcode ? ` · ${item.barcode}` : ''}`}
        actions={
          <>
            <Link to="/products"><Button variant="secondary" icon={<ArrowLeft className="h-4 w-4" />}>Back</Button></Link>
            {canManage && <Link to={`/products/${item.id}/edit`}><Button icon={<Pencil className="h-4 w-4" />}>Edit</Button></Link>}
            {canManage && <Button variant="danger" icon={<Archive className="h-4 w-4" />} onClick={() => setArchiveOpen(true)}>Archive</Button>}
          </>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <SectionCard>
          <div className="grid gap-5 p-4 sm:grid-cols-[160px_1fr]">
            <div className="space-y-2">
              <div className="aspect-square overflow-hidden rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
                {item.image_url ? (
                  <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full place-items-center text-slate-300 dark:text-slate-600"><Boxes className="h-10 w-10" /></div>
                )}
              </div>
              {canManage && (
                <div className="flex flex-wrap gap-1.5">
                  <input
                    ref={fileInput}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    onChange={(event) => {
                      const file = event.target.files?.[0]
                      if (file) upload.mutate(file)
                      event.target.value = ''
                    }}
                  />
                  <Button type="button" variant="secondary" size="sm" icon={<Upload className="h-3.5 w-3.5" />} loading={upload.isPending} onClick={() => fileInput.current?.click()}>Upload</Button>
                  {item.image_url && <Button type="button" variant="ghost" size="sm" icon={<Trash2 className="h-3.5 w-3.5" />} loading={removeImage.isPending} onClick={() => removeImage.mutate()}>Remove</Button>}
                </div>
              )}
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={item.is_active ? 'emerald' : 'slate'}>{item.is_active ? 'Active' : 'Inactive'}</Badge>
                {item.category && <Badge tone="sky">{item.category.name}</Badge>}
                {item.supplier && <Badge tone="violet">{item.supplier.name}</Badge>}
              </div>
              <dl className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2">
                <Detail label="SKU" value={<span className="font-mono">{item.sku}</span>} />
                <Detail label="Barcode" value={<span className="font-mono">{item.barcode ?? '—'}</span>} />
                <Detail label="Unit" value={item.unit} />
                <Detail label="Minimum stock / warehouse" value={number(item.minimum_stock)} />
                <Detail label="Purchase price" value={money(item.purchase_price)} />
                <Detail label="Selling price" value={money(item.selling_price)} />
                <Detail label="Category" value={item.category?.name ?? '—'} />
                <Detail label="Supplier" value={item.supplier?.name ?? '—'} />
              </dl>
              {item.description && <p className="mt-4 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{item.description}</p>}
            </div>
          </div>
        </SectionCard>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
          <StatCard title="Total stock" value={number(total)} hint={item.unit} icon={<Boxes className="h-4 w-4" />} />
          <StatCard title="Stock value" value={money(stockValue)} hint="at purchase cost" icon={<ImagePlus className="h-4 w-4" />} tone="sky" />
        </div>
      </div>

      <SectionCard title="Stock by warehouse" description="Current balances for this product.">
        <DataTable
          columns={stockColumns}
          rows={inventory.data?.data ?? []}
          rowKey={(row) => row.id}
          loading={inventory.isLoading}
          error={inventory.isError ? errorMessage(inventory.error) : null}
          onRetry={() => void inventory.refetch()}
          emptyTitle="No stock records"
          emptyDescription="Receive or transfer stock to create a balance for this product."
        />
      </SectionCard>

      <SectionCard title="Recent stock movements" description="The last ten ledger entries for this product." actions={<Link to={`/stock-movements?product_id=${item.id}`} className="text-xs font-semibold text-emerald-700 hover:underline dark:text-emerald-300">Open ledger</Link>}>
        <DataTable
          columns={movementColumns}
          rows={movements.data?.data ?? []}
          rowKey={(row) => row.id}
          loading={movements.isLoading}
          error={movements.isError ? errorMessage(movements.error) : null}
          onRetry={() => void movements.refetch()}
          emptyTitle="No movements"
          emptyDescription="This product has no stock movement history yet."
        />
      </SectionCard>

      <ConfirmDialog
        open={archiveOpen}
        title="Archive product"
        description={<>Archive <strong>{item.name}</strong>? You can only archive products with no stock on hand and no open purchasing or transfer documents.</>}
        confirmLabel="Archive product"
        destructive
        loading={archive.isPending}
        onCancel={() => setArchiveOpen(false)}
        onConfirm={() => archive.mutate()}
      />
    </div>
  )
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="mt-0.5 truncate text-sm font-medium text-slate-800 dark:text-slate-100">{value}</dd>
    </div>
  )
}
