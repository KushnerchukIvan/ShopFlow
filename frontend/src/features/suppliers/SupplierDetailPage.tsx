import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Mail, MapPin, Pencil, Phone } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  Badge,
  Button,
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
import { supplierApi } from '../../lib/api'
import { errorMessage } from '../../lib/errors'
import { money, shortDate, titleCase } from '../../lib/format'
import type { PurchaseOrder } from '../../types'
import { SupplierFormModal } from './SupplierFormModal'

export function SupplierDetailPage() {
  const params = useParams()
  const supplierId = Number(params.id)
  const { user } = useAuth()
  const canManage = canManageCatalog(user)
  const queryClient = useQueryClient()
  const [editOpen, setEditOpen] = useState(false)

  const supplier = useQuery({ queryKey: ['suppliers', supplierId], queryFn: () => supplierApi.get(supplierId), enabled: Number.isFinite(supplierId) })

  const archive = useMutation({
    mutationFn: () => supplierApi.update(supplierId, { ...supplier.data, is_active: false }),
    onSuccess: () => {
      toast.success('Supplier archived')
      void queryClient.invalidateQueries({ queryKey: ['suppliers'] })
    },
    onError: (error) => toast.error(errorMessage(error)),
  })

  if (supplier.isLoading) return <PageSkeleton />
  if (supplier.isError || !supplier.data) return <ErrorState message={errorMessage(supplier.error)} onRetry={() => void supplier.refetch()} />

  const item = supplier.data

  const columns: Column<PurchaseOrder>[] = [
    {
      key: 'number',
      header: 'Order',
      cell: (order) => <Link to={`/purchase-orders/${order.id}`} className="font-mono text-xs font-semibold text-emerald-700 hover:underline dark:text-emerald-300">{order.order_number}</Link>,
    },
    { key: 'status', header: 'Status', cell: (order) => <Badge tone={statusTone(order.status)}>{titleCase(order.status)}</Badge> },
    { key: 'warehouse', header: 'Warehouse', cell: (order) => order.warehouse?.name ?? '—' },
    { key: 'total', header: 'Total', align: 'right', cell: (order) => money(order.total) },
    { key: 'created', header: 'Created', align: 'right', cell: (order) => shortDate(order.created_at) },
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Supplier"
        title={item.name}
        description={[item.tax_number ? `Tax ID ${item.tax_number}` : null, item.city, item.country].filter(Boolean).join(' · ')}
        actions={
          <>
            <Link to="/suppliers"><Button variant="secondary" icon={<ArrowLeft className="h-4 w-4" />}>Back</Button></Link>
            {canManage && <Button variant="secondary" icon={<Pencil className="h-4 w-4" />} onClick={() => setEditOpen(true)}>Edit</Button>}
            {canManage && item.is_active && <Button variant="danger" loading={archive.isPending} onClick={() => archive.mutate()}>Archive supplier</Button>}
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard title="Products supplied" value={item.products_count ?? 0} icon={<MapPin className="h-4 w-4" />} />
        <StatCard title="Purchase orders" value={item.purchase_orders_count ?? 0} icon={<Mail className="h-4 w-4" />} tone="sky" />
        <StatCard title="Status" value={item.is_active ? 'Active' : 'Archived'} icon={<Phone className="h-4 w-4" />} tone={item.is_active ? 'emerald' : 'violet'} />
        <StatCard title="Location" value={item.city ?? '—'} icon={<MapPin className="h-4 w-4" />} tone="violet" />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <SectionCard title="Purchase order history" description="Most recent orders placed with this supplier.">
          <DataTable
            columns={columns}
            rows={item.purchase_orders ?? []}
            rowKey={(order) => order.id}
            emptyTitle="No purchase orders"
            emptyDescription="Orders placed with this supplier will appear here."
          />
        </SectionCard>

        <SectionCard title="Contact information">
          <dl className="divide-y divide-slate-100 px-4 text-sm dark:divide-slate-800">
            <Row label="Contact person" value={item.contact_person ?? '—'} />
            <Row label="Email" value={item.email ?? '—'} />
            <Row label="Phone" value={item.phone ?? '—'} />
            <Row label="Address" value={item.address ?? '—'} />
            <Row label="City" value={item.city ?? '—'} />
            <Row label="Country" value={item.country ?? '—'} />
            <Row label="Tax number" value={item.tax_number ?? '—'} />
            <Row label="Notes" value={item.notes ?? '—'} />
          </dl>
        </SectionCard>
      </div>

      <SupplierFormModal open={editOpen} supplier={item} onClose={() => setEditOpen(false)} />
    </div>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2.5">
      <dt className="text-xs text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="max-w-[60%] text-right text-xs font-medium text-slate-800 dark:text-slate-100">{value}</dd>
    </div>
  )
}
