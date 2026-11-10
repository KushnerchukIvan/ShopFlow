import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Eye, Pencil, Plus, Trash2 } from 'lucide-react'
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
  type Column,
} from '../../components/ui'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { useAuth } from '../../hooks/useAuth'
import { warehouseApi } from '../../lib/api'
import { errorMessage } from '../../lib/errors'
import type { Warehouse } from '../../types'
import { WarehouseFormModal } from './WarehouseFormModal'

export function WarehousesPage() {
  const { user } = useAuth()
  const canManage = user?.role === 'admin'
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(15)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Warehouse | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Warehouse | null>(null)
  const debouncedSearch = useDebouncedValue(search)

  const warehouses = useQuery({
    queryKey: ['warehouses', { debouncedSearch, page, perPage }],
    queryFn: () => warehouseApi.list({ search: debouncedSearch || undefined, page, per_page: perPage }),
  })

  const remove = useMutation({
    mutationFn: (id: number) => warehouseApi.remove(id),
    onSuccess: () => {
      toast.success('Warehouse deleted')
      setDeleteTarget(null)
      void queryClient.invalidateQueries({ queryKey: ['warehouses'] })
    },
    onError: (error) => toast.error(errorMessage(error)),
  })

  const columns: Column<Warehouse>[] = [
    {
      key: 'name',
      header: 'Warehouse',
      cell: (warehouse) => (
        <div className="min-w-0">
          <Link to={`/warehouses/${warehouse.id}`} className="block truncate font-semibold text-slate-900 hover:text-emerald-700 dark:text-white dark:hover:text-emerald-300">{warehouse.name}</Link>
          <p className="mt-0.5 font-mono text-[11px] text-slate-500 dark:text-slate-400">{warehouse.code}</p>
        </div>
      ),
    },
    { key: 'city', header: 'City', cell: (warehouse) => warehouse.city ?? '—' },
    { key: 'employees', header: 'Employees', align: 'right', cell: (warehouse) => warehouse.users_count ?? 0 },
    { key: 'stock', header: 'Stock records', align: 'right', cell: (warehouse) => warehouse.stock_balances_count ?? 0 },
    { key: 'status', header: 'Status', cell: (warehouse) => <Badge tone={warehouse.is_active ? 'emerald' : 'slate'}>{warehouse.is_active ? 'Active' : 'Inactive'}</Badge> },
    ...(canManage
      ? [{
          key: 'actions',
          header: '',
          align: 'right' as const,
          cell: (warehouse: Warehouse) => (
            <div className="flex items-center justify-end gap-1">
              <button type="button" aria-label={`View ${warehouse.name}`} onClick={() => navigate(`/warehouses/${warehouse.id}`)} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"><Eye className="h-3.5 w-3.5" /></button>
              <button type="button" aria-label={`Edit ${warehouse.name}`} onClick={() => { setEditing(warehouse); setFormOpen(true) }} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"><Pencil className="h-3.5 w-3.5" /></button>
              <button type="button" aria-label={`Delete ${warehouse.name}`} onClick={() => setDeleteTarget(warehouse)} className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          ),
        }]
      : []),
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Network"
        title="Warehouses"
        description="Locations that hold inventory, employees, and purchasing activity."
        actions={canManage ? <Button icon={<Plus className="h-4 w-4" />} onClick={() => { setEditing(null); setFormOpen(true) }}>Add warehouse</Button> : undefined}
      />

      <SectionCard>
        <div className="border-b border-slate-100 p-3 dark:border-slate-800">
          <SearchInput value={search} onChange={(value) => { setSearch(value); setPage(1) }} placeholder="Search name, code, or city" label="Search warehouses" />
        </div>
        <DataTable
          columns={columns}
          rows={warehouses.data?.data ?? []}
          rowKey={(warehouse) => warehouse.id}
          loading={warehouses.isLoading}
          error={warehouses.isError ? errorMessage(warehouses.error) : null}
          onRetry={() => void warehouses.refetch()}
          emptyTitle="No warehouses found"
          emptyDescription="Create a warehouse to start tracking stock."
          onRowClick={(warehouse) => navigate(`/warehouses/${warehouse.id}`)}
          footer={warehouses.data ? <Pagination meta={warehouses.data.meta} onPageChange={setPage} onPerPageChange={(value) => { setPerPage(value); setPage(1) }} /> : undefined}
        />
      </SectionCard>

      <WarehouseFormModal open={formOpen} warehouse={editing} onClose={() => { setFormOpen(false); setEditing(null) }} />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete warehouse"
        description={<>Delete <strong>{deleteTarget?.name}</strong>? Warehouses with inventory, employees, or history cannot be deleted. Consider marking it inactive instead.</>}
        confirmLabel="Delete warehouse"
        destructive
        loading={remove.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && remove.mutate(deleteTarget.id)}
      />
    </div>
  )
}
