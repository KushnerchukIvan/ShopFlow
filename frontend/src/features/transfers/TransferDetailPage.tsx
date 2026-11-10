import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, ArrowLeftRight, Ban, CheckCircle2, Send } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Badge, Button, ConfirmDialog, ErrorState, PageHeader, PageSkeleton, SectionCard, StatCard, statusTone } from '../../components/ui'
import { canOperateInventory, useAuth } from '../../hooks/useAuth'
import { transferApi } from '../../lib/api'
import { errorMessage } from '../../lib/errors'
import { dateTime, number, shortDate, titleCase } from '../../lib/format'

export function TransferDetailPage() {
  const params = useParams()
  const transferId = Number(params.id)
  const { user } = useAuth()
  const canOperate = canOperateInventory(user)
  const queryClient = useQueryClient()
  const [completeOpen, setCompleteOpen] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)

  const transfer = useQuery({ queryKey: ['transfers', transferId], queryFn: () => transferApi.get(transferId), enabled: Number.isFinite(transferId) })

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['transfers'] })
    void queryClient.invalidateQueries({ queryKey: ['inventory'] })
    void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    void queryClient.invalidateQueries({ queryKey: ['products'] })
    void queryClient.invalidateQueries({ queryKey: ['stock-movements'] })
  }

  const submit = useMutation({
    mutationFn: () => transferApi.submit(transferId),
    onSuccess: () => { toast.success('Transfer is now in transit'); invalidate() },
    onError: (error) => toast.error(errorMessage(error)),
  })
  const complete = useMutation({
    mutationFn: () => transferApi.complete(transferId),
    onSuccess: () => { toast.success('Transfer completed'); setCompleteOpen(false); invalidate() },
    onError: (error) => toast.error(errorMessage(error)),
  })
  const cancel = useMutation({
    mutationFn: () => transferApi.cancel(transferId),
    onSuccess: () => { toast.success('Transfer cancelled'); setCancelOpen(false); invalidate() },
    onError: (error) => toast.error(errorMessage(error)),
  })

  if (transfer.isLoading) return <PageSkeleton />
  if (transfer.isError || !transfer.data) return <ErrorState message={errorMessage(transfer.error)} onRetry={() => void transfer.refetch()} />

  const item = transfer.data
  const totalUnits = item.items.reduce((sum, line) => sum + line.quantity, 0)

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Transfer"
        title={item.transfer_number}
        description={`${item.source_warehouse?.name ?? 'Source'} → ${item.destination_warehouse?.name ?? 'Destination'}`}
        actions={
          <>
            <Link to="/transfers"><Button variant="secondary" icon={<ArrowLeft className="h-4 w-4" />}>Back</Button></Link>
            {canOperate && item.status === 'DRAFT' && <Button icon={<Send className="h-4 w-4" />} loading={submit.isPending} onClick={() => submit.mutate()}>Submit transfer</Button>}
            {canOperate && item.status === 'IN_TRANSIT' && <Button icon={<CheckCircle2 className="h-4 w-4" />} onClick={() => setCompleteOpen(true)}>Complete transfer</Button>}
            {canOperate && ['DRAFT', 'IN_TRANSIT'].includes(item.status) && <Button variant="danger" icon={<Ban className="h-4 w-4" />} onClick={() => setCancelOpen(true)}>Cancel</Button>}
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={statusTone(item.status)}>{titleCase(item.status)}</Badge>
        <span className="text-xs text-slate-500 dark:text-slate-400">Created {shortDate(item.created_at)} by {item.creator?.name ?? '—'}</span>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard title="Products" value={item.items.length} icon={<ArrowLeftRight className="h-4 w-4" />} />
        <StatCard title="Units" value={number(totalUnits)} icon={<ArrowLeftRight className="h-4 w-4" />} tone="sky" />
        <StatCard title="Shipped" value={shortDate(item.shipped_at)} icon={<Send className="h-4 w-4" />} tone="violet" />
        <StatCard title="Received" value={shortDate(item.received_at)} icon={<CheckCircle2 className="h-4 w-4" />} tone="emerald" />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <SectionCard title="Transfer lines">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800">
                  <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Product</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">SKU</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-500">Quantity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {item.items.map((line) => (
                  <tr key={line.id}>
                    <td className="px-4 py-3"><Link to={`/products/${line.product_id}`} className="font-semibold text-slate-900 hover:text-emerald-700 dark:text-white dark:hover:text-emerald-300">{line.product?.name ?? `Product #${line.product_id}`}</Link></td>
                    <td className="px-4 py-3 font-mono text-xs">{line.product?.sku ?? '—'}</td>
                    <td className="px-4 py-3 text-right font-semibold">{number(line.quantity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <SectionCard title="Transfer information">
          <dl className="divide-y divide-slate-100 px-4 text-xs dark:divide-slate-800">
            <Row label="Source" value={item.source_warehouse?.name ?? '—'} />
            <Row label="Destination" value={item.destination_warehouse?.name ?? '—'} />
            <Row label="Created by" value={item.creator?.name ?? '—'} />
            <Row label="Shipped at" value={dateTime(item.shipped_at)} />
            <Row label="Received at" value={dateTime(item.received_at)} />
            <Row label="Notes" value={item.notes ?? '—'} />
          </dl>
        </SectionCard>
      </div>

      <ConfirmDialog
        open={completeOpen}
        title="Complete transfer"
        description={<>Completing this transfer moves <strong>{number(totalUnits)} units</strong> from {item.source_warehouse?.name} to {item.destination_warehouse?.name}. Both balances and ledger movements are updated atomically.</>}
        confirmLabel="Complete transfer"
        loading={complete.isPending}
        onCancel={() => setCompleteOpen(false)}
        onConfirm={() => complete.mutate()}
      />

      <ConfirmDialog
        open={cancelOpen}
        title="Cancel transfer"
        description={<>Cancel <strong>{item.transfer_number}</strong>? No stock has been moved while the transfer is in draft. In-transit cancellation leaves balances untouched.</>}
        confirmLabel="Cancel transfer"
        destructive
        loading={cancel.isPending}
        onCancel={() => setCancelOpen(false)}
        onConfirm={() => cancel.mutate()}
      />
    </div>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2.5">
      <dt className="text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="max-w-[62%] text-right font-medium text-slate-800 dark:text-slate-100">{value}</dd>
    </div>
  )
}
