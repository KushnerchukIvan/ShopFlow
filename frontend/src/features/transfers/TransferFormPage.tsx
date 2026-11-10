import { useMutation, useQuery } from '@tanstack/react-query'
import { ArrowLeft, Plus, Save, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Button, Field, FormError, Input, PageHeader, SectionCard, Select, Textarea } from '../../components/ui'
import { inventoryApi, productApi, transferApi, warehouseApi } from '../../lib/api'
import { errorMessage } from '../../lib/errors'

type Line = { key: string; product_id: string; quantity: string }

function newLine(productId = ''): Line {
  return { key: Math.random().toString(36).slice(2), product_id: productId, quantity: '1' }
}

export function TransferFormPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [sourceId, setSourceId] = useState(searchParams.get('warehouseId') ?? '')
  const [destinationId, setDestinationId] = useState('')
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState<Line[]>([newLine(searchParams.get('productId') ?? '')])
  const [error, setError] = useState<string>()
  const [checking, setChecking] = useState(false)

  const warehouses = useQuery({ queryKey: ['warehouses', 'options'], queryFn: () => warehouseApi.list({ per_page: 100 }) })
  const products = useQuery({ queryKey: ['products', 'options'], queryFn: () => productApi.list({ per_page: 100, is_active: true, sort_by: 'name' }) })

  const save = useMutation({
    mutationFn: () => transferApi.create({
      source_warehouse_id: Number(sourceId),
      destination_warehouse_id: Number(destinationId),
      notes: notes.trim() || null,
      items: lines.map((line) => ({ product_id: Number(line.product_id), quantity: Number(line.quantity) })),
    }),
    onSuccess: (transfer) => {
      toast.success('Transfer draft created')
      navigate(`/transfers/${transfer.id}`)
    },
    onError: (mutationError) => setError(errorMessage(mutationError)),
  })

  const updateLine = (key: string, patch: Partial<Line>) => setLines((current) => current.map((line) => line.key === key ? { ...line, ...patch } : line))

  const submit = async () => {
    setError(undefined)
    if (!sourceId || !destinationId) {
      setError('Select both a source and a destination warehouse.')
      return
    }
    if (sourceId === destinationId) {
      setError('Source and destination warehouses must differ.')
      return
    }
    if (lines.some((line) => !line.product_id || Number(line.quantity) < 1)) {
      setError('Every line needs a product and a quantity of at least 1.')
      return
    }
    if (new Set(lines.map((line) => line.product_id)).size !== lines.length) {
      setError('Each product may appear only once in a transfer.')
      return
    }

    setChecking(true)
    try {
      const balances = await Promise.all([...new Set(lines.map((line) => Number(line.product_id)))].map((productId) => inventoryApi.forProduct(productId)))
      for (const line of lines) {
        const balance = balances
          .flatMap((response) => response.data)
          .find((item) => item.product_id === Number(line.product_id) && item.warehouse_id === Number(sourceId))
        if (!balance || balance.quantity < Number(line.quantity)) {
          const product = products.data?.data.find((item) => item.id === Number(line.product_id))
          setError(`Insufficient stock for ${product?.name ?? `product #${line.product_id}`}: available ${balance?.quantity ?? 0}.`)
          return
        }
      }
      save.mutate()
    } catch (checkError) {
      setError(errorMessage(checkError))
    } finally {
      setChecking(false)
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Operations"
        title="New transfer"
        description="Stock is validated on submission and moved atomically when the transfer is completed."
        actions={<Link to="/transfers"><Button variant="secondary" icon={<ArrowLeft className="h-4 w-4" />}>Back</Button></Link>}
      />

      <SectionCard title="Transfer route">
        <div className="grid gap-4 p-4 sm:grid-cols-2">
          <Field label="Source warehouse" htmlFor="transfer-source" required>
            <Select id="transfer-source" value={sourceId} onChange={(event) => setSourceId(event.target.value)}>
              <option value="" disabled>Select source</option>
              {(warehouses.data?.data ?? []).map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name} · {warehouse.code}</option>)}
            </Select>
          </Field>
          <Field label="Destination warehouse" htmlFor="transfer-destination" required>
            <Select id="transfer-destination" value={destinationId} onChange={(event) => setDestinationId(event.target.value)}>
              <option value="" disabled>Select destination</option>
              {(warehouses.data?.data ?? []).filter((warehouse) => String(warehouse.id) !== sourceId).map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name} · {warehouse.code}</option>)}
            </Select>
          </Field>
          <Field label="Notes" htmlFor="transfer-notes" className="sm:col-span-2">
            <Textarea id="transfer-notes" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Optional instructions for the receiving warehouse" />
          </Field>
        </div>
      </SectionCard>

      <SectionCard title="Products" description="Only products with enough stock in the source warehouse can be submitted." actions={<Button size="sm" variant="secondary" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setLines((current) => [...current, newLine()])}>Add line</Button>}>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {lines.map((line, index) => (
            <div key={line.key} className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_140px_auto] sm:items-end">
              <Field label={`Product ${index + 1}`} htmlFor={`transfer-product-${line.key}`} required>
                <Select id={`transfer-product-${line.key}`} value={line.product_id} onChange={(event) => updateLine(line.key, { product_id: event.target.value })}>
                  <option value="" disabled>Select product</option>
                  {(products.data?.data ?? []).map((product) => <option key={product.id} value={product.id}>{product.name} · {product.sku}</option>)}
                </Select>
              </Field>
              <Field label="Quantity" htmlFor={`transfer-quantity-${line.key}`} required>
                <Input id={`transfer-quantity-${line.key}`} type="number" min={1} step={1} value={line.quantity} onChange={(event) => updateLine(line.key, { quantity: event.target.value })} />
              </Field>
              <button type="button" aria-label="Remove line" disabled={lines.length === 1} onClick={() => setLines((current) => current.filter((item) => item.key !== line.key))} className="mb-1 justify-self-end rounded-md p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30 dark:hover:bg-rose-950/40">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </SectionCard>

      <FormError message={error} />
      <div className="flex justify-end gap-2">
        <Link to="/transfers"><Button variant="secondary">Cancel</Button></Link>
        <Button loading={save.isPending || checking} onClick={() => void submit()} icon={<Save className="h-4 w-4" />}>Save draft</Button>
      </div>
    </div>
  )
}
