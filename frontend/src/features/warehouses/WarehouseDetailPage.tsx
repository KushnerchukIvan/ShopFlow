import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Building2, Pencil, Users } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  Badge,
  Button,
  Checkbox,
  DataTable,
  ErrorState,
  Modal,
  PageHeader,
  PageSkeleton,
  SectionCard,
  StatCard,
  statusTone,
  type Column,
} from '../../components/ui'
import { useAuth } from '../../hooks/useAuth'
import { inventoryApi, userApi, warehouseApi } from '../../lib/api'
import { errorMessage } from '../../lib/errors'
import { money, number, titleCase } from '../../lib/format'
import type { InventoryItem, User } from '../../types'
import { WarehouseFormModal } from './WarehouseFormModal'

export function WarehouseDetailPage() {
  const params = useParams()
  const warehouseId = Number(params.id)
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [editOpen, setEditOpen] = useState(false)
  const [employeesOpen, setEmployeesOpen] = useState(false)
  const [selectedUsers, setSelectedUsers] = useState<number[]>([])

  const warehouse = useQuery({ queryKey: ['warehouses', warehouseId], queryFn: () => warehouseApi.get(warehouseId), enabled: Number.isFinite(warehouseId) })
  const inventory = useQuery({
    queryKey: ['inventory', 'warehouse', warehouseId],
    queryFn: () => inventoryApi.list({ warehouse_id: warehouseId, per_page: 15, sort_by: 'product_name' }),
    enabled: Number.isFinite(warehouseId),
  })
  const lowStock = useQuery({
    queryKey: ['inventory', 'warehouse-low-stock', warehouseId],
    queryFn: () => inventoryApi.list({ warehouse_id: warehouseId, low_stock: true, per_page: 8 }),
    enabled: Number.isFinite(warehouseId),
  })
  const allUsers = useQuery({ queryKey: ['users', 'options'], queryFn: () => userApi.list({ per_page: 100 }), enabled: user?.role === 'admin' })

  const employees = useMutation({
    mutationFn: () => warehouseApi.updateEmployees(warehouseId, selectedUsers),
    onSuccess: () => {
      toast.success('Warehouse employees updated')
      setEmployeesOpen(false)
      void queryClient.invalidateQueries({ queryKey: ['warehouses', warehouseId] })
      void queryClient.invalidateQueries({ queryKey: ['warehouses'] })
    },
    onError: (error) => toast.error(errorMessage(error)),
  })

  if (warehouse.isLoading) return <PageSkeleton />
  if (warehouse.isError || !warehouse.data) return <ErrorState message={errorMessage(warehouse.error)} onRetry={() => void warehouse.refetch()} />

  const item = warehouse.data
  const stats = item.stats

  const columns: Column<InventoryItem>[] = [
    {
      key: 'product',
      header: 'Product',
      sortable: 'product_name',
      cell: (row) => (
        <Link to={`/products/${row.product_id}`} className="block min-w-0 hover:text-emerald-700 dark:hover:text-emerald-300">
          <span className="block truncate font-semibold text-slate-900 dark:text-white">{row.product?.name ?? `Product #${row.product_id}`}</span>
          <span className="block font-mono text-[11px] text-slate-500 dark:text-slate-400">{row.product?.sku}</span>
        </Link>
      ),
    },
    { key: 'quantity', header: 'On hand', sortable: 'quantity', align: 'right', cell: (row) => <span className="font-semibold">{number(row.quantity)}</span> },
    { key: 'minimum', header: 'Minimum', align: 'right', cell: (row) => number(row.minimum_stock) },
    { key: 'cost', header: 'Value', sortable: 'stock_value', align: 'right', cell: (row) => money(row.stock_value) },
    { key: 'status', header: 'Status', align: 'right', cell: (row) => <Badge tone={statusTone(row.stock_status)}>{row.stock_status === 'out' ? 'Out' : titleCase(row.stock_status)}</Badge> },
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Warehouse"
        title={item.name}
        description={`${item.code}${item.city ? ` · ${item.city}` : ''}`}
        actions={
          <>
            <Link to="/warehouses"><Button variant="secondary" icon={<ArrowLeft className="h-4 w-4" />}>Back</Button></Link>
            {user?.role === 'admin' && (
              <Button variant="secondary" icon={<Users className="h-4 w-4" />} onClick={() => { setSelectedUsers(item.users?.map((member) => member.id) ?? []); setEmployeesOpen(true) }}>Employees</Button>
            )}
            {(user?.role === 'admin') && <Button icon={<Pencil className="h-4 w-4" />} onClick={() => setEditOpen(true)}>Edit</Button>}
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard title="Products" value={number(stats?.product_count ?? 0)} icon={<Building2 className="h-4 w-4" />} />
        <StatCard title="Units on hand" value={number(stats?.unit_count ?? 0)} icon={<Building2 className="h-4 w-4" />} tone="sky" />
        <StatCard title="Stock value" value={money(stats?.stock_value ?? 0)} icon={<Building2 className="h-4 w-4" />} tone="violet" />
        <StatCard title="Low stock records" value={number(stats?.low_stock_records ?? 0)} icon={<Building2 className="h-4 w-4" />} tone="amber" />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <SectionCard title="Warehouse inventory" description="Current balances in this location." actions={<Link to={`/inventory?warehouse_id=${item.id}`} className="text-xs font-semibold text-emerald-700 hover:underline dark:text-emerald-300">Open inventory</Link>}>
          <DataTable
            columns={columns}
            rows={inventory.data?.data ?? []}
            rowKey={(row) => row.id}
            loading={inventory.isLoading}
            error={inventory.isError ? errorMessage(inventory.error) : null}
            onRetry={() => void inventory.refetch()}
            emptyTitle="No inventory records"
            emptyDescription="Stock received or transferred here will appear in this list."
          />
        </SectionCard>

        <div className="space-y-3">
          <SectionCard title="Location">
            <dl className="divide-y divide-slate-100 px-4 text-sm dark:divide-slate-800">
              <Row label="Code" value={<span className="font-mono">{item.code}</span>} />
              <Row label="City" value={item.city ?? '—'} />
              <Row label="Address" value={item.address ?? '—'} />
              <Row label="Status" value={<Badge tone={item.is_active ? 'emerald' : 'slate'}>{item.is_active ? 'Active' : 'Inactive'}</Badge>} />
              <Row label="Pending orders" value={number(stats?.pending_purchase_orders ?? 0)} />
            </dl>
          </SectionCard>

          <SectionCard title={`Assigned employees (${item.users?.length ?? 0})`}>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {(item.users ?? []).map((member) => (
                <div key={member.id} className="flex items-center justify-between gap-2 px-4 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-slate-800 dark:text-slate-100">{member.name}</p>
                    <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">{member.email}</p>
                  </div>
                  <Badge tone="slate">{titleCase(member.role)}</Badge>
                </div>
              ))}
              {!item.users?.length && <p className="px-4 py-5 text-xs text-slate-500 dark:text-slate-400">No employees assigned.</p>}
            </div>
          </SectionCard>

          <SectionCard title="Low-stock products" description="At or below the minimum in this warehouse." actions={<Link to={`/inventory?warehouse_id=${item.id}&low_stock=true`} className="text-xs font-semibold text-emerald-700 hover:underline dark:text-emerald-300">View all</Link>}>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {(lowStock.data?.data ?? []).map((balance) => (
                <div key={balance.id} className="flex items-center justify-between gap-2 px-4 py-2.5">
                  <Link to={`/products/${balance.product_id}`} className="min-w-0 text-xs font-semibold text-slate-800 hover:text-emerald-700 dark:text-slate-100 dark:hover:text-emerald-300">
                    <span className="block truncate">{balance.product?.name}</span>
                    <span className="block font-mono text-[10px] font-normal text-slate-500 dark:text-slate-400">{balance.product?.sku}</span>
                  </Link>
                  <Badge tone={balance.quantity === 0 ? 'rose' : 'amber'}>{balance.quantity} / {balance.minimum_stock}</Badge>
                </div>
              ))}
              {!lowStock.isLoading && !lowStock.data?.data.length && <p className="px-4 py-5 text-xs text-slate-500 dark:text-slate-400">No low-stock products here.</p>}
            </div>
          </SectionCard>
        </div>
      </div>

      <WarehouseFormModal open={editOpen} warehouse={item} onClose={() => setEditOpen(false)} />

      <Modal
        open={employeesOpen}
        onClose={() => setEmployeesOpen(false)}
        title="Assign employees"
        description="Select the users who can access this warehouse."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setEmployeesOpen(false)}>Cancel</Button>
            <Button loading={employees.isPending} onClick={() => employees.mutate()}>Save assignments</Button>
          </div>
        }
      >
        <div className="grid gap-2">
          {(allUsers.data?.data ?? []).map((member: User) => (
            <label key={member.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700">
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-slate-800 dark:text-slate-100">{member.name}</span>
                <span className="block truncate text-[11px] text-slate-500 dark:text-slate-400">{member.email} · {titleCase(member.role)}</span>
              </span>
              <Checkbox
                label=""
                checked={selectedUsers.includes(member.id)}
                onChange={(event) => setSelectedUsers((current) => event.target.checked ? [...current, member.id] : current.filter((id) => id !== member.id))}
              />
            </label>
          ))}
          {!allUsers.data?.data.length && <p className="text-xs text-slate-500">No users available.</p>}
        </div>
      </Modal>
    </div>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <dt className="text-xs text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="text-right text-xs font-medium text-slate-800 dark:text-slate-100">{value}</dd>
    </div>
  )
}
