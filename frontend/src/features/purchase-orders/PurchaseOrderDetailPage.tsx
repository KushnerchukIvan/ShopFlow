import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Ban, CheckCircle2, Pencil, Send, Truck } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  Badge,
  Button,
  ConfirmDialog,
  ErrorState,
  Field,
  FormError,
  Input,
  Modal,
  PageHeader,
  PageSkeleton,
  SectionCard,
  StatCard,
  statusTone,
} from '../../components/ui'
import { canManageCatalog, canOperateInventory, useAuth } from '../../hooks/useAuth'
import { purchaseOrderApi } from '../../lib/api'
import { errorMessage } from '../../lib/errors'
import { dateTime, money, number, shortDate, titleCase } from '../../lib/format'

export function PurchaseOrderDetailPage() {
  const params = useParams()
  const orderId = Number(params.id)
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [receiveOpen, setReceiveOpen] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [quantities, setQuantities] = useState<Record<number, string>>({})
  const [receiveError, setReceiveError] = useState<string>()

  const order = useQuery({ queryKey: ['purchase-orders', orderId], queryFn: () => purchaseOrderApi.get(orderId), enabled: Number.isFinite(orderId) })
  const canManage = canManageCatalog(user)
  const canReceive = canOperateInventory(user)

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
    void queryClient.invalidateQueries({ queryKey: ['inventory'] })
    void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    void queryClient.invalidateQueries({ queryKey: ['stock-movements'] })
  }

  const submit = useMutation({
    mutationFn: () => purchaseOrderApi.submit(orderId),
    onSuccess: () => { toast.success('Purchase order submitted'); invalidate() },
    onError: (error) => toast.error(errorMessage(error)),
  })

  const cancel = useMutation({
    mutationFn: () => purchaseOrderApi.cancel(orderId),
    onSuccess: () => { toast.success('Purchase order cancelled'); setCancelOpen(false); invalidate() },
    onError: (error) => toast.error(errorMessage(error)),
  })

  const receive = useMutation({
    mutationFn: () => purchaseOrderApi.receive(orderId, Object.entries(quantities)
      .map(([productId, quantity]) => ({ product_id: Number(productId), quantity: Number(quantity) }))
      .filter((item) => item.quantity > 0)),
    onSuccess: () => {
      toast.success('Receipt recorded')
      setReceiveOpen(false)
      setQuantities({})
      invalidate()
    },
    onError: (error) => setReceiveError(errorMessage(error)),
  })

  const outstandingItems = useMemo(() => (order.data?.items ?? []).filter((item) => item.quantity_outstanding > 0), [order.data])

  if (order.isLoading) return <PageSkeleton />
  if (order.isError || !order.data) return <ErrorState message={errorMessage(order.error)} onRetry={() => void order.refetch()} />

  const item = order.data
  const receivedValue = item.items.reduce((sum, line) => sum + line.quantity_received * Number(line.unit_cost), 0)
  const outstanding = item.items.reduce((sum, line) => sum + line.quantity_outstanding, 0)
  const canCancel = ['DRAFT', 'ORDERED', 'PARTIALLY_RECEIVED'].includes(item.status)

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Purchase order"
        title={item.order_number}
        description={`${item.supplier?.name ?? 'Supplier'} · ${item.warehouse?.name ?? 'Warehouse'}`}
        actions={
          <>
            <Link to="/purchase-orders"><Button variant="secondary" icon={<ArrowLeft className="h-4 w-4" />}>Back</Button></Link>
            {canManage && item.status === 'DRAFT' && <Link to={`/purchase-orders/${item.id}/edit`}><Button variant="secondary" icon={<Pencil className="h-4 w-4" />}>Edit draft</Button></Link>}
            {canManage && item.status === 'DRAFT' && <Button icon={<Send className="h-4 w-4" />} loading={submit.isPending} onClick={() => submit.mutate()}>Submit order</Button>}
            {canReceive && ['ORDERED', 'PARTIALLY_RECEIVED'].includes(item.status) && (
              <Button icon={<Truck className="h-4 w-4" />} onClick={() => { setQuantities(Object.fromEntries(outstandingItems.map((line) => [line.product_id, String(line.quantity_outstanding)]))); setReceiveError(undefined); setReceiveOpen(true) }}>Receive goods</Button>
            )}
            {canManage && canCancel && <Button variant="danger" icon={<Ban className="h-4 w-4" />} onClick={() => setCancelOpen(true)}>Cancel</Button>}
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={statusTone(item.status)}>{titleCase(item.status)}</Badge>
        <span className="text-xs text-slate-500 dark:text-slate-400">Created {shortDate(item.created_at)} by {item.creator?.name ?? '—'}</span>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard title="Order total" value={money(item.total)} icon={<CheckCircle2 className="h-4 w-4" />} />
        <StatCard title="Received value" value={money(receivedValue)} icon={<Truck className="h-4 w-4" />} tone="sky" />
        <StatCard title="Outstanding units" value={number(outstanding)} icon={<Truck className="h-4 w-4" />} tone="amber" />
        <StatCard title="Expected" value={shortDate(item.expected_at)} icon={<Truck className="h-4 w-4" />} tone="violet" />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <SectionCard title="Order lines" description="Received quantities are recorded in the inventory ledger.">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800">
                  <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Product</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-500">Ordered</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-500">Received</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-500">Outstanding</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-500">Unit cost</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-500">Line total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {item.items.map((line) => {
                  const progress = line.quantity_ordered === 0 ? 0 : Math.round((line.quantity_received / line.quantity_ordered) * 100)
                  return (
                    <tr key={line.id}>
                      <td className="px-4 py-3">
                        <Link to={`/products/${line.product_id}`} className="font-semibold text-slate-900 hover:text-emerald-700 dark:text-white dark:hover:text-emerald-300">{line.product?.name}</Link>
                        <p className="font-mono text-[11px] text-slate-500 dark:text-slate-400">{line.product?.sku}</p>
                        <div className="mt-1.5 h-1.5 w-32 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                          <div className={`h-full rounded-full ${progress === 100 ? 'bg-emerald-500' : 'bg-sky-500'}`} style={{ width: `${progress}%` }} />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-medium">{number(line.quantity_ordered)}</td>
                      <td className="px-4 py-3 text-right font-medium text-emerald-700 dark:text-emerald-300">{number(line.quantity_received)}</td>
                      <td className="px-4 py-3 text-right font-medium">{number(line.quantity_outstanding)}</td>
                      <td className="px-4 py-3 text-right">{money(line.unit_cost)}</td>
                      <td className="px-4 py-3 text-right font-semibold">{money(line.line_total)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <div className="space-y-3">
          <SectionCard title="Order information">
            <dl className="divide-y divide-slate-100 px-4 text-xs dark:divide-slate-800">
              <DetailRow label="Supplier" value={item.supplier?.name ?? '—'} />
              <DetailRow label="Warehouse" value={item.warehouse?.name ?? '—'} />
              <DetailRow label="Created by" value={item.creator?.name ?? '—'} />
              <DetailRow label="Expected" value={shortDate(item.expected_at)} />
              <DetailRow label="Received at" value={dateTime(item.received_at)} />
              <DetailRow label="Notes" value={item.notes ?? '—'} />
            </dl>
          </SectionCard>
        </div>
      </div>

      <Modal
        open={receiveOpen}
        onClose={() => setReceiveOpen(false)}
        title="Receive goods"
        description="Enter the quantity received for each line. You can receive partially."
        size="lg"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setReceiveOpen(false)}>Cancel</Button>
            <Button
              loading={receive.isPending}
              onClick={() => {
                setReceiveError(undefined)
                if (Object.values(quantities).every((value) => Number(value) <= 0)) {
                  setReceiveError('Enter at least one received quantity.')
                  return
                }
                receive.mutate()
              }}
            >
              Record receipt
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          {outstandingItems.map((line) => (
            <div key={line.id} className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{line.product?.name}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">{number(line.quantity_outstanding)} outstanding of {number(line.quantity_ordered)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Field label="Receive" htmlFor={`receive-${line.id}`}>
                    <Input
                      id={`receive-${line.id}`}
                      type="number"
                      min={0}
                      max={line.quantity_outstanding}
                      value={quantities[line.product_id] ?? ''}
                      onChange={(event) => setQuantities((current) => ({ ...current, [line.product_id]: event.target.value }))}
                      className="w-24"
                    />
                  </Field>
                </div>
              </div>
            </div>
          ))}
          {outstandingItems.length === 0 && <p className="text-sm text-slate-500">Everything on this order has been received.</p>}
          <FormError message={receiveError} />
        </div>
      </Modal>

      <ConfirmDialog
        open={cancelOpen}
        title="Cancel purchase order"
        description={<>Cancel <strong>{item.order_number}</strong>? Cancelling is permitted until the order is fully received. Received stock is not reversed.</>}
        confirmLabel="Cancel order"
        destructive
        loading={cancel.isPending}
        onCancel={() => setCancelOpen(false)}
        onConfirm={() => cancel.mutate()}
      />
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2.5">
      <dt className="text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="max-w-[62%] text-right font-medium text-slate-800 dark:text-slate-100">{value}</dd>
    </div>
  )
}
