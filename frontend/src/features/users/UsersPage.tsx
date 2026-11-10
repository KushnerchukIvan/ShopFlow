import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, ShieldCheck, UserCheck, UserX } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import {
  Badge,
  Button,
  Checkbox,
  DataTable,
  Field,
  FormActions,
  FormError,
  Input,
  Modal,
  PageHeader,
  Pagination,
  SearchInput,
  SectionCard,
  Select,
  type Column,
} from '../../components/ui'
import { useAuth, roleLabels } from '../../hooks/useAuth'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { userApi, warehouseApi } from '../../lib/api'
import { errorMessage } from '../../lib/errors'
import { shortDate } from '../../lib/format'
import type { Role, User } from '../../types'

const roles: Role[] = ['admin', 'manager', 'warehouse_operator', 'viewer']

type UserForm = { name: string; email: string; password: string; role: Role; is_active: boolean; warehouse_ids: number[] }
const emptyForm: UserForm = { name: '', email: '', password: '', role: 'viewer', is_active: true, warehouse_ids: [] }

export function UsersPage() {
  const { user: currentUser } = useAuth()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [role, setRole] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(15)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<User | null>(null)
  const [form, setForm] = useState<UserForm>(emptyForm)
  const [formError, setFormError] = useState<string>()
  const debouncedSearch = useDebouncedValue(search)

  const users = useQuery({
    queryKey: ['users', { debouncedSearch, role, status, page, perPage }],
    queryFn: () => userApi.list({ search: debouncedSearch || undefined, role: role || undefined, is_active: status === '' ? undefined : status === 'active', page, per_page: perPage }),
  })
  const warehouses = useQuery({ queryKey: ['warehouses', 'options'], queryFn: () => warehouseApi.list({ per_page: 100 }) })

  const save = useMutation({
    mutationFn: () => {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        role: form.role,
        is_active: form.is_active,
        warehouse_ids: form.warehouse_ids,
        ...(form.password ? { password: form.password } : {}),
      }
      return editing ? userApi.update(editing.id, payload) : userApi.create(payload)
    },
    onSuccess: () => {
      toast.success(editing ? 'User updated' : 'User created')
      setFormOpen(false)
      setEditing(null)
      void queryClient.invalidateQueries({ queryKey: ['users'] })
    },
    onError: (error) => setFormError(errorMessage(error)),
  })

  const setStatusMutation = useMutation({
    mutationFn: ({ user, isActive }: { user: User; isActive: boolean }) => userApi.updateStatus(user.id, isActive),
    onSuccess: (updated) => {
      toast.success(`${updated.name} is now ${updated.is_active ? 'active' : 'inactive'}`)
      void queryClient.invalidateQueries({ queryKey: ['users'] })
    },
    onError: (error) => toast.error(errorMessage(error)),
  })

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setFormError(undefined)
    setFormOpen(true)
  }

  const openEdit = (user: User) => {
    setEditing(user)
    setForm({ name: user.name, email: user.email, password: '', role: user.role, is_active: user.is_active, warehouse_ids: user.warehouse_ids ?? [] })
    setFormError(undefined)
    setFormOpen(true)
  }

  const columns: Column<User>[] = [
    {
      key: 'user',
      header: 'User',
      cell: (user) => (
        <div className="min-w-0">
          <p className="truncate font-semibold text-slate-900 dark:text-white">{user.name}{user.id === currentUser?.id ? ' (you)' : ''}</p>
          <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">{user.email}</p>
        </div>
      ),
    },
    { key: 'role', header: 'Role', cell: (user) => <Badge tone={user.role === 'admin' ? 'violet' : user.role === 'manager' ? 'sky' : 'slate'}>{roleLabels[user.role]}</Badge> },
    { key: 'warehouses', header: 'Warehouses', cell: (user) => user.role === 'admin' ? <span className="text-xs text-slate-500">All warehouses</span> : <span className="text-xs">{user.warehouses?.map((warehouse) => warehouse.name).join(', ') || '—'}</span>, className: 'hidden md:table-cell' },
    { key: 'status', header: 'Status', cell: (user) => <Badge tone={user.is_active ? 'emerald' : 'rose'}>{user.is_active ? 'Active' : 'Inactive'}</Badge> },
    { key: 'created', header: 'Created', cell: (user) => <span className="whitespace-nowrap text-xs">{shortDate(user.created_at)}</span>, className: 'hidden lg:table-cell' },
    {
      key: 'actions',
      header: '',
      align: 'right',
      cell: (user) => (
        <div className="flex items-center justify-end gap-1">
          <button type="button" aria-label={`Edit ${user.name}`} onClick={() => openEdit(user)} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"><Pencil className="h-3.5 w-3.5" /></button>
          <button
            type="button"
            aria-label={`${user.is_active ? 'Deactivate' : 'Activate'} ${user.name}`}
            disabled={user.id === currentUser?.id || setStatusMutation.isPending}
            onClick={() => setStatusMutation.mutate({ user, isActive: !user.is_active })}
            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30 dark:hover:bg-slate-800"
          >
            {user.is_active ? <UserX className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Administration"
        title="Users"
        description="Manage accounts, roles, warehouse access, and active status."
        actions={<Button icon={<Plus className="h-4 w-4" />} onClick={openCreate}>Add user</Button>}
      />

      <SectionCard>
        <div className="grid gap-2 border-b border-slate-100 p-3 dark:border-slate-800 sm:grid-cols-[minmax(0,1fr)_170px_150px]">
          <SearchInput value={search} onChange={(value) => { setSearch(value); setPage(1) }} placeholder="Search name or email" label="Search users" />
          <Select aria-label="Filter by role" value={role} onChange={(event) => { setRole(event.target.value); setPage(1) }}>
            <option value="">All roles</option>
            {roles.map((value) => <option key={value} value={value}>{roleLabels[value]}</option>)}
          </Select>
          <Select aria-label="Filter by status" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1) }}>
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
        </div>
        <DataTable
          columns={columns}
          rows={users.data?.data ?? []}
          rowKey={(user) => user.id}
          loading={users.isLoading}
          error={users.isError ? errorMessage(users.error) : null}
          onRetry={() => void users.refetch()}
          emptyTitle="No users found"
          footer={users.data ? <Pagination meta={users.data.meta} onPageChange={setPage} onPerPageChange={(value) => { setPerPage(value); setPage(1) }} /> : undefined}
        />
      </SectionCard>

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Edit user' : 'New user'}
        description="Roles control what a user can do. Warehouse assignments limit their inventory scope."
        size="lg"
        footer={
          <FormActions>
            <Button variant="secondary" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button
              loading={save.isPending}
              onClick={() => {
                setFormError(undefined)
                if (!form.name.trim() || !form.email.trim() || (!editing && form.password.length < 8)) {
                  setFormError('Name, email, and a password of at least 8 characters are required.')
                  return
                }
                save.mutate()
              }}
            >
              {editing ? 'Save changes' : 'Create user'}
            </Button>
          </FormActions>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" htmlFor="user-name" required><Input id="user-name" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} maxLength={255} /></Field>
          <Field label="Email address" htmlFor="user-email" required><Input id="user-email" type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} maxLength={255} /></Field>
          <Field label={editing ? 'New password' : 'Password'} htmlFor="user-password" hint={editing ? 'Leave blank to keep the current password.' : 'At least 8 characters.'}>
            <Input id="user-password" type="password" autoComplete="new-password" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} />
          </Field>
          <Field label="Role" htmlFor="user-role" required>
            <Select id="user-role" value={form.role} onChange={(event) => setForm((current) => ({ ...current, role: event.target.value as Role }))}>
              {roles.map((value) => <option key={value} value={value}>{roleLabels[value]}</option>)}
            </Select>
          </Field>
          <div className="sm:col-span-2"><Checkbox label="Account is active" checked={form.is_active} onChange={(event) => setForm((current) => ({ ...current, is_active: event.target.checked }))} /></div>
          <div className="sm:col-span-2">
            <p className="mb-2 text-xs font-semibold text-slate-600 dark:text-slate-300">Warehouse assignments</p>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {(warehouses.data?.data ?? []).map((warehouse) => (
                <label key={warehouse.id} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs dark:border-slate-700">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-emerald-600"
                    checked={form.warehouse_ids.includes(warehouse.id)}
                    onChange={(event) => setForm((current) => ({
                      ...current,
                      warehouse_ids: event.target.checked ? [...current.warehouse_ids, warehouse.id] : current.warehouse_ids.filter((id) => id !== warehouse.id),
                    }))}
                  />
                  <span className="min-w-0"><span className="block truncate font-medium text-slate-800 dark:text-slate-100">{warehouse.name}</span><span className="font-mono text-[10px] text-slate-500">{warehouse.code}</span></span>
                </label>
              ))}
            </div>
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400"><ShieldCheck className="mr-1 inline h-3 w-3" />Administrators have global warehouse access regardless of assignments.</p>
          </div>
          <div className="sm:col-span-2"><FormError message={formError} /></div>
        </div>
      </Modal>
    </div>
  )
}
