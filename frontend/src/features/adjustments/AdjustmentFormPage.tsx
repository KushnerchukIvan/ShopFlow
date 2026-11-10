import { useMutation, useQuery } from '@tanstack/react-query'
import { ArrowLeft, Plus, Save, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Button, Field, FormError, Input, PageHeader, SectionCard, Select, Textarea } from '../../components/ui'
import { adjustmentApi, inventoryApi, productApi, warehouseApi } from '../../lib/api'
import { errorMessage } from '../../lib/errors'

type Line = { key: string; product_id: string; counted_quantity: string }

function newLine(productId = ''): Line {
  return { key: Math.random().toString(36).slice(2), product_id: productId, counted_quantity: '0' }
}

export function AdjustmentFormPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [warehouseId, setWarehouseId] = useState(searchParams.get('warehouseId') ?? '')
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState<Line[]>([newLine(searchParams.get('productId') ?? '')])
  const [error, setError] = useState<string>()

  const warehouses = useQuery({ queryKey: ['warehouses', 'options'], queryFn: () => warehouseApi.list({ per_page: 100 }) })
  const products = useQuery({ queryKey: ['products', 'options'], queryFn: () => productApi.list({ per_page: 100, is_active: true, sort_by: 'name' }) })
  const balances = useQuery({
    queryKey: ['inventory', 'adjustment-warehouse', warehouseId],
    queryFn: () => inventoryApi.list({ warehouse_id: Number(warehouseId), per_page: 100 }),
    enabled: Boolean(warehouseId),
  })

  const systemByProduct = useMemo(() => new Map((balances.data?.data ?? []).map((balance) => [balance.product_id, balance.quantity])), [balances.data])

  const save = useMutation({
    mutationFn: () => adjustmentApi.create({
      warehouse_id: Number(warehouseId),
      reason: reason.trim(),
      notes: notes.trim() || null,
      items: lines.map((line) => ({ product_id: Number(line.product_id), counted_quantity: Number(line.counted_quantity) })),
    }),
    onSuccess: (adjustment) => {
      toast.success('Stock count saved as draft')
      navigate(`/adjustments/${adjustment.id}`)
    },
    onError: (mutationError) => setError(errorMessage(mutationError)),
  })

  const updateLine = (key: string, patch: Partial<Line>) => setLines((current) => current.map((line) => line.key === key ? { ...line, ...patch } : line))

  const submit = () => {
    setError(undefined)
    if (!warehouseId) {
      setError('Select the warehouse being counted.')
      return
    }
    if (!reason.trim()) {
      setError('Enter a reason for the count.')
      return
    }
    if (lines.some((line) => !line.product_id || Number(line.counted_quantity) < 0)) {
      setError('Every line needs a product and a non-negative counted quantity.')
      return
    }
    if (new Set(lines.map((line) => line.product_id)).size !== lines.length) {
      setError('Each product may appear only once.')
      return
    }
    save.mutate()
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Operations"
        title="New physical count"
        description="Enter counted quantities. Differences are applied only after the draft is submitted."
        actions={<Link to="/adjustments"><Button variant="secondary" icon={<ArrowLeft className="h-4 w-4" />}>Back</Button></Link>}
      />

      <SectionCard title="Count details">
        <div className="grid gap-4 p-4 sm:grid-cols-2">
          <Field label="Warehouse" htmlFor="adjustment-warehouse" required>
            <Select id="adjustment-warehouse" value={warehouseId} onChange={(event) => setWarehouseId(event.target.value)}>
              <option value="" disabled>Select warehouse</option>
              {(warehouses.data?.data ?? []).map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name} · {warehouse.code}</option>)}
            </Select>
          </Field>
          <Field label="Reason" htmlFor="adjustment-reason" required>
            <Input id="adjustment-reason" value={reason} onChange={(event) => setReason(event.target.value)} maxLength={255} placeholder="e.g. Quarterly cycle count" />
          </Field>
          <Field label="Notes" htmlFor="adjustment-notes" className="sm:col-span-2">
            <Textarea id="adjustment-notes" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Optional details about the count" />
          </Field>
        </div>
      </SectionCard>

      <SectionCard title="Counted products" description="System quantities come from the selected warehouse's current balances." actions={<Button size="sm" variant="secondary" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setLines((current) => [...current, newLine()])}>Add product</Button>}>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {lines.map((line, index) => {
            const system = systemByProduct.get(Number(line.product_id)) ?? 0
            const difference = Number(line.counted_quantity || 0) - system
            return (
              <div key={line.key} className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1.4fr)_120px_120px_110px_auto] sm:items-end">
                <Field label={`Product ${index + 1}`} htmlFor={`adjustment-product-${line.key}`} required>
                  <Select id={`adjustment-product-${line.key}`} value={line.product_id} onChange={(event) => updateLine(line.key, { product_id: event.target.value })}>
                    <option value="" disabled>Select product</option>
                    {(products.data?.data ?? []).map((product) => <option key={product.id} value={product.id}>{product.name} · {product.sku}</option>)}
                  </Select>
                </Field>
                <Field label="System" htmlFor={`system-${line.key}`}>
                  <Input id={`system-${line.key}`} value={line.product_id ? system : '—'} readOnly className="bg-slate-50 dark:bg-slate-800" />
                </Field>
                <Field label="Counted" htmlFor={`counted-${line.key}`} required>
                  <Input id={`counted-${line.key}`} type="number" min={0} step={1} value={line.counted_quantity} onChange={(event) => updateLine(line.key, { counted_quantity: event.target.value })} />
                </Field>
                <div className="pb-2 text-right">
                  <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400">Difference</p>
                  <p className={difference === 0 ? 'text-sm font-semibold text-slate-500' : difference > 0 ? 'text-sm font-semibold text-emerald-600 dark:text-emerald-400' : 'text-sm font-semibold text-rose-600 dark:text-rose-400'}>{difference > 0 ? '+' : ''}{difference}</p>
                </div>
                <button type="button" aria-label="Remove line" disabled={lines.length === 1} onClick={() => setLines((current) => current.filter((item) => item.key !== line.key))} className="mb-1 justify-self-end rounded-md p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30 dark:hover:bg-rose-950/40">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )
          })}
        </div>
      </SectionCard>

      <FormError message={error} />
      <div className="flex justify-end gap-2">
        <Link to="/adjustments"><Button variant="secondary">Cancel</Button></Link>
        <Button loading={save.isPending} onClick={submit} icon={<Save className="h-4 w-4" />}>Save draft</Button>
      </div>
    </div>
  )
}
