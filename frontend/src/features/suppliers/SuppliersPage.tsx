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
import { supplierApi } from '../../lib/api'
import { errorMessage } from '../../lib/errors'
import type { Supplier } from '../../types'
import { SupplierFormModal } from './SupplierFormModal'

export function SuppliersPage() {
  const { user } = useAuth()
  const canManage = canManageCatalog(user)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [active, setActive] = useState('')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(15)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Supplier | null>(null)
  const [archiveTarget, setArchiveTarget] = useState<Supplier | null>(null)
  const debouncedSearch = useDebouncedValue(search)

  const suppliers = useQuery({
    queryKey: ['suppliers', { debouncedSearch, active, page, perPage }],
    queryFn: () => supplierApi.list({ search: debouncedSearch || undefined, is_active: active === '' ? undefined : active === 'active', page, per_page: perPage }),
  })

  const archive = useMutation({
    mutationFn: (supplier: Supplier) => supplierApi.update(supplier.id, { ...supplier, is_active: false }),
    onSuccess: () => {
      toast.success('Supplier archived')
      setArchiveTarget(null)
      void queryClient.invalidateQueries({ queryKey: ['suppliers'] })
    },
    onError: (error) => toast.error(errorMessage(error)),
  })

  const columns: Column<Supplier>[] = [
    {
      key: 'name',
      header: 'Supplier',
      cell: (supplier) => (
        <div className="min-w-0">
          <Link to={`/suppliers/${supplier.id}`} className="block truncate font-semibold text-slate-900 hover:text-emerald-700 dark:text-white dark:hover:text-emerald-300">{supplier.name}</Link>
          <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">{supplier.contact_person ?? 'No contact person'}</p>
        </div>
      ),
    },
    {
      key: 'contact',
      header: 'Contact',
      cell: (supplier) => (
        <div className="min-w-0 text-xs">
          <p className="truncate">{supplier.email ?? '—'}</p>
          <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">{supplier.phone ?? ''}</p>
        </div>
      ),
    },
    { key: 'location', header: 'Location', cell: (supplier) => [supplier.city, supplier.country].filter(Boolean).join(', ') || '—' },
    { key: 'products', header: 'Products', align: 'right', cell: (supplier) => supplier.products_count ?? 0 },
    { key: 'orders', header: 'Orders', align: 'right', cell: (supplier) => supplier.purchase_orders_count ?? 0 },
    { key: 'status', header: 'Status', cell: (supplier) => <Badge tone={supplier.is_active ? 'emerald' : 'slate'}>{supplier.is_active ? 'Active' : 'Archived'}</Badge> },
    ...(canManage
      ? [{
          key: 'actions',
          header: '',
          align: 'right' as const,
          cell: (supplier: Supplier) => (
            <div className="flex items-center justify-end gap-1">
              <button type="button" aria-label={`View ${supplier.name}`} onClick={() => navigate(`/suppliers/${supplier.id}`)} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"><Eye className="h-3.5 w-3.5" /></button>
              <button type="button" aria-label={`Edit ${supplier.name}`} onClick={() => { setEditing(supplier); setFormOpen(true) }} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"><Pencil className="h-3.5 w-3.5" /></button>
              {supplier.is_active && <button type="button" aria-label={`Archive ${supplier.name}`} onClick={() => setArchiveTarget(supplier)} className="rounded-md p-1.5 text-slate-400 hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-950/40"><Archive className="h-3.5 w-3.5" /></button>}
            </div>
          ),
        }]
      : []),
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Purchasing"
        title="Suppliers"
        description="Vendors that supply your catalog and purchase orders."
        actions={canManage ? <Button icon={<Plus className="h-4 w-4" />} onClick={() => { setEditing(null); setFormOpen(true) }}>Add supplier</Button> : undefined}
      />

      <SectionCard>
        <div className="grid gap-2 border-b border-slate-100 p-3 dark:border-slate-800 sm:grid-cols-[minmax(0,1fr)_160px]">
          <SearchInput value={search} onChange={(value) => { setSearch(value); setPage(1) }} placeholder="Search name, email, or phone" label="Search suppliers" />
          <Select aria-label="Filter by status" value={active} onChange={(event) => { setActive(event.target.value); setPage(1) }}>
            <option value="">All suppliers</option>
            <option value="active">Active</option>
            <option value="inactive">Archived</option>
          </Select>
        </div>
        <DataTable
          columns={columns}
          rows={suppliers.data?.data ?? []}
          rowKey={(supplier) => supplier.id}
          loading={suppliers.isLoading}
          error={suppliers.isError ? errorMessage(suppliers.error) : null}
          onRetry={() => void suppliers.refetch()}
          emptyTitle="No suppliers found"
          emptyDescription="Add suppliers to create purchase orders."
          onRowClick={(supplier) => navigate(`/suppliers/${supplier.id}`)}
          footer={suppliers.data ? <Pagination meta={suppliers.data.meta} onPageChange={setPage} onPerPageChange={(value) => { setPerPage(value); setPage(1) }} /> : undefined}
        />
      </SectionCard>

      <SupplierFormModal open={formOpen} supplier={editing} onClose={() => { setFormOpen(false); setEditing(null) }} />

      <ConfirmDialog
        open={Boolean(archiveTarget)}
        title="Archive supplier"
        description={<>Archive <strong>{archiveTarget?.name}</strong>? Archived suppliers stay linked to historical purchase orders but cannot be selected for new orders.</>}
        confirmLabel="Archive supplier"
        loading={archive.isPending}
        onCancel={() => setArchiveTarget(null)}
        onConfirm={() => archiveTarget && archive.mutate(archiveTarget)}
      />
    </div>
  )
}
