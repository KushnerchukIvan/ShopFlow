import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowDownToLine, ArrowUpFromLine, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button, Field, FormError, Input, Modal, Select, Textarea } from '../../components/ui'
import { inventoryApi, productApi, warehouseApi } from '../../lib/api'
import { errorMessage } from '../../lib/errors'

export type StockOperation = 'stock-in' | 'stock-out'

type Props = {
  open: boolean
  operation: StockOperation
  productId?: number
  warehouseId?: number
  onClose: () => void
}

export function StockFormModal({ open, operation, productId, warehouseId, onClose }: Props) {
  const queryClient = useQueryClient()
  const [product, setProduct] = useState(productId ? String(productId) : '')
  const [warehouse, setWarehouse] = useState(warehouseId ? String(warehouseId) : '')
  const [quantity, setQuantity] = useState('1')
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string>()

  const products = useQuery({ queryKey: ['products', 'stock-options'], queryFn: () => productApi.list({ per_page: 100, is_active: true, sort_by: 'name' }), enabled: open })
  const warehouses = useQuery({ queryKey: ['warehouses', 'stock-options'], queryFn: () => warehouseApi.list({ per_page: 100 }), enabled: open })
  const balances = useQuery({
    queryKey: ['inventory', 'stock-options', product],
    queryFn: () => inventoryApi.forProduct(Number(product)),
    enabled: open && Boolean(product) && operation === 'stock-out',
  })

  useEffect(() => {
    if (!open) return
    setProduct(productId ? String(productId) : '')
    setWarehouse(warehouseId ? String(warehouseId) : '')
    setQuantity('1')
    setReason('')
    setNotes('')
    setError(undefined)
  }, [open, productId, warehouseId])

  const currentBalance = balances.data?.data.find((balance) => String(balance.warehouse_id) === warehouse)?.quantity

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        product_id: Number(product),
        warehouse_id: Number(warehouse),
        quantity: Number(quantity),
        reason: reason.trim(),
        notes: notes.trim() || null,
      }
      return operation === 'stock-in' ? inventoryApi.stockIn(payload) : inventoryApi.stockOut(payload)
    },
    onSuccess: () => {
      toast.success(operation === 'stock-in' ? 'Stock received' : 'Stock removed')
      void queryClient.invalidateQueries({ queryKey: ['inventory'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      void queryClient.invalidateQueries({ queryKey: ['products'] })
      void queryClient.invalidateQueries({ queryKey: ['stock-movements'] })
      onClose()
    },
    onError: (mutationError) => setError(errorMessage(mutationError)),
  })

  const isIn = operation === 'stock-in'

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isIn ? 'Record stock in' : 'Record stock out'}
      description={isIn ? 'Increase the balance for one product in a warehouse.' : 'Decrease the balance. Stock cannot become negative.'}
      footer={
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            variant={isIn ? 'primary' : 'danger'}
            loading={mutation.isPending}
            icon={isIn ? <ArrowDownToLine className="h-4 w-4" /> : <ArrowUpFromLine className="h-4 w-4" />}
            onClick={() => {
              setError(undefined)
              if (!product || !warehouse || Number(quantity) < 1 || !reason.trim()) {
                setError('Product, warehouse, a positive quantity, and a reason are required.')
                return
              }
              mutation.mutate()
            }}
          >
            {isIn ? 'Add stock' : 'Remove stock'}
          </Button>
        </div>
      }
    >
      <div className="grid gap-4">
        <Field label="Product" htmlFor="stock-product" required>
          <Select id="stock-product" value={product} onChange={(event) => { setProduct(event.target.value); setError(undefined) }}>
            <option value="" disabled>Select product</option>
            {(products.data?.data ?? []).map((item) => <option key={item.id} value={item.id}>{item.name} · {item.sku}</option>)}
          </Select>
        </Field>
        <Field label="Warehouse" htmlFor="stock-warehouse" required>
          <Select id="stock-warehouse" value={warehouse} onChange={(event) => { setWarehouse(event.target.value); setError(undefined) }}>
            <option value="" disabled>Select warehouse</option>
            {(warehouses.data?.data ?? []).map((item) => <option key={item.id} value={item.id}>{item.name} · {item.code}</option>)}
          </Select>
        </Field>
        <div className="grid gap-1">
          <Field label="Quantity" htmlFor="stock-quantity" required>
            <Input id="stock-quantity" type="number" min={1} step={1} value={quantity} onChange={(event) => setQuantity(event.target.value)} />
          </Field>
          {!isIn && warehouse && product && (
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {balances.isLoading ? <span className="inline-flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Checking available stock…</span> : `Available in this warehouse: ${currentBalance ?? 0}`}
            </p>
          )}
        </div>
        <Field label="Reason" htmlFor="stock-reason" required>
          <Input id="stock-reason" value={reason} onChange={(event) => setReason(event.target.value)} maxLength={255} placeholder={isIn ? 'e.g. Supplier delivery' : 'e.g. Damaged goods'} />
        </Field>
        <Field label="Notes" htmlFor="stock-notes">
          <Textarea id="stock-notes" value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={2000} placeholder="Optional context for the ledger" />
        </Field>
        <FormError message={error} />
      </div>
    </Modal>
  )
}
