import { useMutation, useQuery } from '@tanstack/react-query'
import { ArrowLeft, Plus, Save, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Button, Field, FormError, Input, PageHeader, PageSkeleton, SectionCard, Select, Textarea } from '../../components/ui'
import { productApi, purchaseOrderApi, supplierApi, warehouseApi } from '../../lib/api'
import { errorMessage } from '../../lib/errors'
import { money } from '../../lib/format'

type Line = { key: string; product_id: string; quantity: string; unit_cost: string }

function newLine(productId = ''): Line {
  return { key: Math.random().toString(36).slice(2), product_id: productId, quantity: '1', unit_cost: '0' }
}

export function PurchaseOrderFormPage() {
  const params = useParams()
  const [searchParams] = useSearchParams()
  const orderId = params.id ? Number(params.id) : undefined
  const navigate = useNavigate()
  const [supplierId, setSupplierId] = useState('')
  const [warehouseId, setWarehouseId] = useState('')
  const [expectedAt, setExpectedAt] = useState('')
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState<Line[]>([newLine(searchParams.get('productId') ?? '')])
  const [error, setError] = useState<string>()

  const order = useQuery({ queryKey: ['purchase-orders', orderId], queryFn: () => purchaseOrderApi.get(orderId!), enabled: Boolean(orderId) })
  const suppliers = useQuery({ queryKey: ['suppliers', 'options'], queryFn: () => supplierApi.list({ per_page: 100, is_active: true }) })
  const warehouses = useQuery({ queryKey: ['warehouses', 'options'], queryFn: () => warehouseApi.list({ per_page: 100 }) })
  const products = useQuery({ queryKey: ['products', 'options'], queryFn: () => productApi.list({ per_page: 100, is_active: true, sort_by: 'name' }) })

  useEffect(() => {
    if (!order.data) return
    setSupplierId(String(order.data.supplier_id))
    setWarehouseId(String(order.data.warehouse_id))
    setExpectedAt(order.data.expected_at ? order.data.expected_at.slice(0, 10) : '')
    setNotes(order.data.notes ?? '')
    setLines(order.data.items.map((item) => ({
      key: `item-${item.id}`,
      product_id: String(item.product_id),
      quantity: String(item.quantity_ordered),
      unit_cost: item.unit_cost,
    })))
  }, [order.data])

  const productMap = useMemo(() => new Map((products.data?.data ?? []).map((product) => [product.id, product])), [products.data])
  const total = lines.reduce((sum, line) => sum + Number(line.quantity || 0) * Number(line.unit_cost || 0), 0)

  const save = useMutation({
    mutationFn: () => {
      const payload = {
        supplier_id: Number(supplierId),
        warehouse_id: Number(warehouseId),
        expected_at: expectedAt || null,
        notes: notes.trim() || null,
        items: lines.map((line) => ({
          product_id: Number(line.product_id),
          quantity: Number(line.quantity),
          unit_cost: Number(line.unit_cost),
        })),
      }
      return orderId ? purchaseOrderApi.update(orderId, payload) : purchaseOrderApi.create(payload)
    },
    onSuccess: (saved) => {
      toast.success(orderId ? 'Draft updated' : 'Purchase order created')
      navigate(`/purchase-orders/${saved.id}`)
    },
    onError: (mutationError) => setError(errorMessage(mutationError)),
  })

  const updateLine = (key: string, patch: Partial<Line>) => setLines((current) => current.map((line) => line.key === key ? { ...line, ...patch } : line))

  const submit = () => {
    setError(undefined)
    if (!supplierId || !warehouseId) {
      setError('Select a supplier and a receiving warehouse.')
      return
    }
    if (lines.length === 0 || lines.some((line) => !line.product_id || Number(line.quantity) < 1)) {
      setError('Every line needs a product and a quantity of at least 1.')
      return
    }
    if (new Set(lines.map((line) => line.product_id)).size !== lines.length) {
      setError('Each product may appear only once. Merge duplicate lines before saving.')
      return
    }
    save.mutate()
  }

  if (orderId && order.isLoading) return <PageSkeleton />
  if (orderId && order.data && order.data.status !== 'DRAFT') {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
        Only draft orders can be edited. <Link to={`/purchase-orders/${orderId}`} className="font-semibold underline">Open the order</Link>.
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Purchasing"
        title={orderId ? 'Edit purchase order' : 'New purchase order'}
        description="Add product lines, quantities, and agreed unit costs."
        actions={<Link to={orderId ? `/purchase-orders/${orderId}` : '/purchase-orders'}><Button variant="secondary" icon={<ArrowLeft className="h-4 w-4" />}>Back</Button></Link>}
      />

      <SectionCard title="Order details">
        <div className="grid gap-4 p-4 sm:grid-cols-2">
          <Field label="Supplier" htmlFor="po-supplier" required>
            <Select id="po-supplier" value={supplierId} onChange={(event) => setSupplierId(event.target.value)}>
              <option value="" disabled>Select supplier</option>
              {(suppliers.data?.data ?? []).map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
            </Select>
          </Field>
          <Field label="Receiving warehouse" htmlFor="po-warehouse" required>
            <Select id="po-warehouse" value={warehouseId} onChange={(event) => setWarehouseId(event.target.value)}>
              <option value="" disabled>Select warehouse</option>
              {(warehouses.data?.data ?? []).map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}
            </Select>
          </Field>
          <Field label="Expected delivery" htmlFor="po-expected">
            <Input id="po-expected" type="date" value={expectedAt} onChange={(event) => setExpectedAt(event.target.value)} />
          </Field>
          <Field label="Notes" htmlFor="po-notes">
            <Textarea id="po-notes" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Delivery instructions or internal notes" />
          </Field>
        </div>
      </SectionCard>

      <SectionCard title="Product lines" description="Unit cost is pre-filled from the product purchase price." actions={<Button size="sm" variant="secondary" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setLines((current) => [...current, newLine()])}>Add line</Button>}>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {lines.map((line, index) => {
            const product = productMap.get(Number(line.product_id))
            return (
              <div key={line.key} className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1.6fr)_100px_120px_120px_auto] sm:items-end">
                <Field label={`Product ${index + 1}`} htmlFor={`product-${line.key}`} required>
                  <Select
                    id={`product-${line.key}`}
                    value={line.product_id}
                    onChange={(event) => {
                      const selected = productMap.get(Number(event.target.value))
                      updateLine(line.key, { product_id: event.target.value, unit_cost: selected?.purchase_price ?? line.unit_cost })
                    }}
                  >
                    <option value="" disabled>Select product</option>
                    {(products.data?.data ?? []).map((item) => <option key={item.id} value={item.id}>{item.name} · {item.sku}</option>)}
                  </Select>
                </Field>
                <Field label="Quantity" htmlFor={`quantity-${line.key}`} required>
                  <Input id={`quantity-${line.key}`} type="number" min={1} step={1} value={line.quantity} onChange={(event) => updateLine(line.key, { quantity: event.target.value })} />
                </Field>
                <Field label="Unit cost" htmlFor={`cost-${line.key}`} required>
                  <Input id={`cost-${line.key}`} type="number" min={0} step="0.01" value={line.unit_cost} onChange={(event) => updateLine(line.key, { unit_cost: event.target.value })} />
                </Field>
                <div className="pb-2 text-right">
                  <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400">Line total</p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{money(Number(line.quantity || 0) * Number(line.unit_cost || 0))}</p>
                </div>
                <button type="button" aria-label="Remove line" disabled={lines.length === 1} onClick={() => setLines((current) => current.filter((item) => item.key !== line.key))} className="mb-1 justify-self-end rounded-md p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30 dark:hover:bg-rose-950/40">
                  <Trash2 className="h-4 w-4" />
                </button>
                {product && <p className="text-[11px] text-slate-500 dark:text-slate-400 sm:col-span-5">SKU {product.sku} · {product.unit}</p>}
              </div>
            )
          })}
        </div>
        <div className="flex flex-col gap-3 border-t border-slate-100 p-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500 dark:text-slate-400">Order total</p>
          <p className="text-xl font-semibold text-slate-900 dark:text-white">{money(total)}</p>
        </div>
      </SectionCard>

      <FormError message={error} />
      <div className="flex justify-end gap-2">
        <Link to={orderId ? `/purchase-orders/${orderId}` : '/purchase-orders'}><Button variant="secondary">Cancel</Button></Link>
        <Button loading={save.isPending} onClick={submit} icon={<Save className="h-4 w-4" />}>{orderId ? 'Save draft' : 'Create draft'}</Button>
      </div>
    </div>
  )
}
