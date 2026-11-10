import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, CheckCircle2, ClipboardCheck } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Badge, Button, ConfirmDialog, ErrorState, PageHeader, PageSkeleton, SectionCard, StatCard, statusTone } from '../../components/ui'
import { canOperateInventory, useAuth } from '../../hooks/useAuth'
import { adjustmentApi } from '../../lib/api'
import { errorMessage } from '../../lib/errors'
import { dateTime, number, shortDate, titleCase } from '../../lib/format'

export function AdjustmentDetailPage() {
  const params = useParams()
  const adjustmentId = Number(params.id)
  const { user } = useAuth()
  const canOperate = canOperateInventory(user)
  const queryClient = useQueryClient()
  const [submitOpen, setSubmitOpen] = useState(false)

  const adjustment = useQuery({ queryKey: ['adjustments', adjustmentId], queryFn: () => adjustmentApi.get(adjustmentId), enabled: Number.isFinite(adjustmentId) })

  const submit = useMutation({
    mutationFn: () => adjustmentApi.submit(adjustmentId),
    onSuccess: () => {
      toast.success('Stock adjustment applied')
      setSubmitOpen(false)
      void queryClient.invalidateQueries({ queryKey: ['adjustments'] })
      void queryClient.invalidateQueries({ queryKey: ['inventory'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      void queryClient.invalidateQueries({ queryKey: ['stock-movements'] })
    },
    onError: (error) => toast.error(errorMessage(error)),
  })

  if (adjustment.isLoading) return <PageSkeleton />
  if (adjustment.isError || !adjustment.data) return <ErrorState message={errorMessage(adjustment.error)} onRetry={() => void adjustment.refetch()} />

  const item = adjustment.data
  const netDifference = item.items.reduce((sum, line) => sum + line.difference, 0)
  const increases = item.items.filter((line) => line.difference > 0).length
  const decreases = item.items.filter((line) => line.difference < 0).length

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Stock adjustment"
        title={item.adjustment_number}
        description={`${item.warehouse?.name ?? 'Warehouse'} · ${item.reason}`}
        actions={
          <>
            <Link to="/adjustments"><Button variant="secondary" icon={<ArrowLeft className="h-4 w-4" />}>Back</Button></Link>
            {canOperate && item.status === 'DRAFT' && <Button icon={<CheckCircle2 className="h-4 w-4" />} onClick={() => setSubmitOpen(true)}>Apply count</Button>}
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={statusTone(item.status)}>{titleCase(item.status)}</Badge>
        <span className="text-xs text-slate-500 dark:text-slate-400">Created {shortDate(item.created_at)} by {item.creator?.name ?? '—'}</span>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard title="Products counted" value={item.items.length} icon={<ClipboardCheck className="h-4 w-4" />} />
        <StatCard title="Net difference" value={`${netDifference > 0 ? '+' : ''}${number(netDifference)}`} icon={<ClipboardCheck className="h-4 w-4" />} tone={netDifference === 0 ? 'sky' : netDifference > 0 ? 'emerald' : 'rose'} />
        <StatCard title="Increases" value={increases} icon={<ClipboardCheck className="h-4 w-4" />} tone="emerald" />
        <StatCard title="Decreases" value={decreases} icon={<ClipboardCheck className="h-4 w-4" />} tone="amber" />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <SectionCard title="Counted items" description="The difference is applied only when the adjustment is submitted.">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800">
                  <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Product</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-500">System</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-500">Counted</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-500">Difference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {item.items.map((line) => (
                  <tr key={line.id}>
                    <td className="px-4 py-3">
                      <Link to={`/products/${line.product_id}`} className="font-semibold text-slate-900 hover:text-emerald-700 dark:text-white dark:hover:text-emerald-300">{line.product?.name ?? `Product #${line.product_id}`}</Link>
                      <p className="font-mono text-[11px] text-slate-500 dark:text-slate-400">{line.product?.sku}</p>
                    </td>
                    <td className="px-4 py-3 text-right">{number(line.system_quantity)}</td>
                    <td className="px-4 py-3 text-right font-semibold">{number(line.counted_quantity)}</td>
                    <td className={`px-4 py-3 text-right font-semibold ${line.difference === 0 ? 'text-slate-500' : line.difference > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      {line.difference > 0 ? '+' : ''}{number(line.difference)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <SectionCard title="Adjustment information">
          <dl className="divide-y divide-slate-100 px-4 text-xs dark:divide-slate-800">
            <Row label="Warehouse" value={item.warehouse?.name ?? '—'} />
            <Row label="Reason" value={item.reason} />
            <Row label="Status" value={<Badge tone={statusTone(item.status)}>{titleCase(item.status)}</Badge>} />
            <Row label="Created by" value={item.creator?.name ?? '—'} />
            <Row label="Created at" value={dateTime(item.created_at)} />
            <Row label="Notes" value={item.notes ?? '—'} />
          </dl>
        </SectionCard>
      </div>

      <ConfirmDialog
        open={submitOpen}
        title="Apply stock adjustment"
        description={<>Apply this count? Balances will be set to the counted quantities and the difference will be recorded as adjustment movements. This cannot be undone.</>}
        confirmLabel="Apply count"
        loading={submit.isPending}
        onCancel={() => setSubmitOpen(false)}
        onConfirm={() => submit.mutate()}
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
